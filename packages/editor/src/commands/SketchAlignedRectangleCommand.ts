import { createEditDraft } from '@occt-draw/core';
import {
    AddClosedLineSegmentsRequest,
    findSketchByFeatureId,
    referencePlaneToPlane,
    type CadDocument,
} from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import { sketchPointToWorldOnPlane, type Sketch } from '@occt-draw/sketch';
import type { EditorState, SketchEditSession } from '../state/editorState';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { projectScreenPointToSketch2 } from './sketchProjection';

const ALIGNED_RECTANGLE_DRAG_THRESHOLD_PIXELS = 3;
const MIN_RECTANGLE_SIDE = 1e-6;

interface PendingAlignedRectangleDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchAlignedRectangleCommand extends CadCommand {
    public readonly id = 'sketch-aligned-rectangle';
    private pendingDrag: PendingAlignedRectangleDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-aligned-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'aligned-rectangle',
                pendingAlignedRectangleEdge: null,
                pendingCircleCenter: null,
                pendingLineStart: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-aligned-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        this.pendingDrag = null;

        if (session?.pendingAlignedRectangleEdge || session?.pendingRectangleStart) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingAlignedRectangleEdge: null,
                    pendingRectangleStart: null,
                },
                commandSession: {
                    id: 'sketch-aligned-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return createHandledCommandResult({
            activeSketchSession: null,
            commandSession: {
                id: 'select',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'idle',
            },
            draft: null,
        });
    }

    public override exit(): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override pointerCancel(): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override pointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!session.pendingRectangleStart && !session.pendingAlignedRectangleEdge) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingRectangleStart: point,
                },
                commandSession: {
                    id: 'sketch-aligned-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (session.pendingRectangleStart && !session.pendingAlignedRectangleEdge) {
            return this.createFirstEdgeResult(context, session, point);
        }

        return this.createAlignedRectangleResult(context, session, point);
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (this.pendingDrag?.pointerId === event.pointerId && !this.pendingDrag.moved) {
            this.pendingDrag = {
                ...this.pendingDrag,
                moved:
                    distanceScreenPoints(this.pendingDrag.startPoint, event.point) >
                    ALIGNED_RECTANGLE_DRAG_THRESHOLD_PIXELS,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const plane = findSketchPlane(state, activeSketch.sketch);
        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!plane || !point) {
            return createUnhandledCommandResult();
        }

        if (session.pendingRectangleStart && !session.pendingAlignedRectangleEdge) {
            return createHandledCommandResult({
                draft: createLineDraft(plane, session.pendingRectangleStart, point),
            });
        }

        if (session.pendingAlignedRectangleEdge) {
            const corners = getAlignedRectangleCorners(session.pendingAlignedRectangleEdge, point);

            if (!corners) {
                return createUnhandledCommandResult();
            }

            return createHandledCommandResult({
                draft: createRectangleDraft(plane, corners),
            });
        }

        return createUnhandledCommandResult();
    }

    public override pointerUp(event: CommandPointerEvent, context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session?.pendingRectangleStart || !activeSketch || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        return this.createFirstEdgeResult(context, session, point);
    }

    private createFirstEdgeResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const start = session.pendingRectangleStart;

        if (!start || Vec2.distance(start, point) <= MIN_RECTANGLE_SIDE) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingAlignedRectangleEdge: {
                    end: point,
                    start,
                },
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-aligned-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    private createAlignedRectangleResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const firstEdge = session.pendingAlignedRectangleEdge;

        if (!firstEdge) {
            return createUnhandledCommandResult();
        }

        const corners = getAlignedRectangleCorners(firstEdge, point);

        if (!corners) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingAlignedRectangleEdge: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-aligned-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddClosedLineSegmentsRequest({
                partStudioId: state.document.getActivePartStudio().id,
                points: corners,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }
}

function createLineDraft(plane: Plane3, start: Vector2, end: Vector2) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-aligned-rectangle:first-edge',
        kind: 'temporary',
    }).withTemporaryObjects([
        {
            color: Vec3.of(0.1, 0.55, 1),
            id: 'draft:sketch-aligned-rectangle:first-edge:segment',
            kind: 'line-segment',
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, start),
                sketchPointToWorldOnPlane(plane, end),
            ),
            visible: true,
        },
    ]);
}

function createRectangleDraft(plane: Plane3, corners: readonly Vector2[]) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-aligned-rectangle',
        kind: 'temporary',
    }).withTemporaryObjects(
        corners.map((corner, index) => {
            const next = corners[(index + 1) % corners.length] ?? corner;

            return {
                color: Vec3.of(0.1, 0.55, 1),
                id: `draft:sketch-aligned-rectangle:segment:${String(index)}`,
                kind: 'line-segment',
                segment: new LineSegment3(
                    sketchPointToWorldOnPlane(plane, corner),
                    sketchPointToWorldOnPlane(plane, next),
                ),
                visible: true,
            };
        }),
    );
}

function getAlignedRectangleCorners(
    firstEdge: { readonly end: Vector2; readonly start: Vector2 },
    point: Vector2,
): readonly Vector2[] | null {
    const edge = Vec2.subtract(firstEdge.end, firstEdge.start);
    const edgeLength = Vec2.length(edge);

    if (edgeLength <= MIN_RECTANGLE_SIDE) {
        return null;
    }

    const normal = Vec2.of(-edge.y / edgeLength, edge.x / edgeLength);
    const height = Vec2.dot(Vec2.subtract(point, firstEdge.end), normal);

    if (Math.abs(height) <= MIN_RECTANGLE_SIDE) {
        return null;
    }

    const offset = Vec2.scale(normal, height);

    return [
        firstEdge.start,
        firstEdge.end,
        Vec2.add(firstEdge.end, offset),
        Vec2.add(firstEdge.start, offset),
    ];
}

function projectPointerToSketch(
    state: EditorState,
    sketch: Sketch,
    event: CommandPointerEvent,
): Vector2 | null {
    return projectScreenPointToSketch2({
        camera: state.navigation.camera,
        partStudio: state.document.getActivePartStudio(),
        planeObjectRef: sketch.plane.planeObjectRef,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
    });
}

function findActiveSketch(
    state: EditorState,
    session: SketchEditSession,
): { readonly sketch: Sketch } | null {
    const partStudio = state.document.getActivePartStudio();
    const sketch = findSketchByFeatureId(partStudio, session.sketchFeatureId);

    return sketch ? { sketch } : null;
}

function findSketchPlane(state: EditorState, sketch: Sketch): Plane3 | null {
    const object = state.document
        .getActivePartStudio()
        .findObjectById(sketch.plane.planeObjectRef.id);

    return object?.kind === 'reference-plane' ? referencePlaneToPlane(object) : null;
}

function distanceScreenPoints(
    first: CommandPointerEvent['point'],
    second: CommandPointerEvent['point'],
): number {
    return Math.hypot(second.x - first.x, second.y - first.y);
}
