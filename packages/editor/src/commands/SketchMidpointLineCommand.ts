import { createEditDraft } from '@occt-draw/core';
import {
    AddLineSegmentRequest,
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

const MIDPOINT_LINE_DRAG_THRESHOLD_PIXELS = 3;
const MIN_LINE_LENGTH = 1e-6;

interface PendingMidpointLineDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchMidpointLineCommand extends CadCommand {
    public readonly id = 'sketch-midpoint-line';
    private pendingDrag: PendingMidpointLineDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-midpoint-line',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'midpoint-line',
                pendingCircleCenter: null,
                pendingAlignedRectangleEdge: null,
                pendingLineStart: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-midpoint-line',
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

        if (session?.pendingLineStart) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingLineStart: null,
                },
                commandSession: {
                    id: 'sketch-midpoint-line',
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

        if (!session.pendingLineStart) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingLineStart: {
                        kind: 'point',
                        point,
                    },
                },
                commandSession: {
                    id: 'sketch-midpoint-line',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createMidpointLineResult(context, session, point);
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
                    MIDPOINT_LINE_DRAG_THRESHOLD_PIXELS,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingLineStart || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const plane = findSketchPlane(state, activeSketch.sketch);
        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!plane || !point || session.pendingLineStart.kind !== 'point') {
            return createUnhandledCommandResult();
        }

        const segment = getMidpointLineSegment(session.pendingLineStart.point, point);

        if (!segment) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createMidpointLineDraft(plane, segment.start, segment.end),
        });
    }

    public override pointerUp(event: CommandPointerEvent, context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session?.pendingLineStart || !activeSketch || !drag?.moved) {
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

        return this.createMidpointLineResult(context, session, point);
    }

    private createMidpointLineResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const midpoint = session.pendingLineStart;

        if (midpoint?.kind !== 'point') {
            return createUnhandledCommandResult();
        }

        const segment = getMidpointLineSegment(midpoint.point, point);

        if (!segment) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStart: null,
            },
            commandSession: {
                id: 'sketch-midpoint-line',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddLineSegmentRequest({
                endPosition: segment.end,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
                startPosition: segment.start,
            }),
            draft: null,
        });
    }
}

function createMidpointLineDraft(plane: Plane3, start: Vector2, end: Vector2) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-midpoint-line',
        kind: 'temporary',
    }).withTemporaryObjects([
        {
            color: Vec3.of(0.1, 0.55, 1),
            id: 'draft:sketch-midpoint-line:segment',
            kind: 'line-segment',
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, start),
                sketchPointToWorldOnPlane(plane, end),
            ),
            visible: true,
        },
    ]);
}

function getMidpointLineSegment(
    midpoint: Vector2,
    endpoint: Vector2,
): { readonly end: Vector2; readonly start: Vector2 } | null {
    const start = Vec2.of(midpoint.x * 2 - endpoint.x, midpoint.y * 2 - endpoint.y);

    if (Vec2.distance(start, endpoint) <= MIN_LINE_LENGTH) {
        return null;
    }

    return {
        end: endpoint,
        start,
    };
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
