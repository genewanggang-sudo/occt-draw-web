import { createEditDraft } from '@occt-draw/core';
import {
    AddCornerRectangleRequest,
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

const CENTER_RECTANGLE_DRAG_THRESHOLD_PIXELS = 3;
const MIN_RECTANGLE_SIDE = 1e-6;

interface PendingCenterRectangleDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchCenterRectangleCommand extends CadCommand {
    public readonly id = 'sketch-center-rectangle';
    private pendingDrag: PendingCenterRectangleDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-center-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'center-rectangle',
                pendingCircleCenter: null,
                pendingAlignedRectangleEdge: null,
                pendingLineStart: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-center-rectangle',
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

        if (session?.pendingRectangleStart) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingRectangleStart: null,
                },
                commandSession: {
                    id: 'sketch-center-rectangle',
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

        if (!session.pendingRectangleStart) {
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
                    id: 'sketch-center-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createCenterRectangleResult(context, session, point, event);
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
                    CENTER_RECTANGLE_DRAG_THRESHOLD_PIXELS,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingRectangleStart || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const plane = findSketchPlane(state, activeSketch.sketch);
        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!plane || !point) {
            return createUnhandledCommandResult();
        }

        const rectangle = getCenterRectangleCorners(
            session.pendingRectangleStart,
            event.altKey ? constrainCornerToSquare(session.pendingRectangleStart, point) : point,
        );

        if (!rectangle) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createRectangleDraft(plane, rectangle.firstCorner, rectangle.oppositeCorner),
        });
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
            return this.clearPendingRectangleResult(context, session);
        }

        const rectangle = getCenterRectangleCorners(
            session.pendingRectangleStart,
            event.altKey ? constrainCornerToSquare(session.pendingRectangleStart, point) : point,
        );

        if (!rectangle) {
            return this.clearPendingRectangleResult(context, session);
        }

        return this.createCenterRectangleResult(context, session, point, event);
    }

    private createCenterRectangleResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
        event: CommandPointerEvent,
    ): CommandResult {
        const state = context.getState();
        const center = session.pendingRectangleStart;

        if (!center) {
            return createUnhandledCommandResult();
        }

        const rectangle = getCenterRectangleCorners(
            center,
            event.altKey ? constrainCornerToSquare(center, point) : point,
        );

        if (!rectangle) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-center-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddCornerRectangleRequest({
                firstCorner: rectangle.firstCorner,
                oppositeCorner: rectangle.oppositeCorner,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }

    private clearPendingRectangleResult(
        context: CommandContext,
        session: SketchEditSession,
    ): CommandResult {
        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-center-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }
}

function createRectangleDraft(plane: Plane3, firstCorner: Vector2, oppositeCorner: Vector2) {
    const segments = getRectangleSegments(plane, firstCorner, oppositeCorner);

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-center-rectangle',
        kind: 'temporary',
    }).withTemporaryObjects(
        segments.map((segment, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-center-rectangle:segment:${String(index)}`,
            kind: 'line-segment',
            segment,
            visible: true,
        })),
    );
}

function getCenterRectangleCorners(
    center: Vector2,
    corner: Vector2,
): { readonly firstCorner: Vector2; readonly oppositeCorner: Vector2 } | null {
    const dx = corner.x - center.x;
    const dy = corner.y - center.y;

    if (Math.abs(dx) <= MIN_RECTANGLE_SIDE || Math.abs(dy) <= MIN_RECTANGLE_SIDE) {
        return null;
    }

    return {
        firstCorner: Vec2.of(center.x - dx, center.y - dy),
        oppositeCorner: Vec2.of(center.x + dx, center.y + dy),
    };
}

function getRectangleSegments(
    plane: Plane3,
    firstCorner: Vector2,
    oppositeCorner: Vector2,
): readonly LineSegment3[] {
    const corners = [
        firstCorner,
        Vec2.of(oppositeCorner.x, firstCorner.y),
        oppositeCorner,
        Vec2.of(firstCorner.x, oppositeCorner.y),
    ] as const;

    return corners.map((corner, index) => {
        const next = corners[(index + 1) % corners.length] ?? corner;

        return new LineSegment3(
            sketchPointToWorldOnPlane(plane, corner),
            sketchPointToWorldOnPlane(plane, next),
        );
    });
}

function constrainCornerToSquare(center: Vector2, raw: Vector2): Vector2 {
    const dx = raw.x - center.x;
    const dy = raw.y - center.y;
    const side = Math.min(Math.abs(dx), Math.abs(dy));

    return Vec2.of(center.x + Math.sign(dx || 1) * side, center.y + Math.sign(dy || 1) * side);
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
