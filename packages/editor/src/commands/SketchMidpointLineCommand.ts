import { createEditDraft } from '@occt-draw/core';
import { AddLineSegmentRequest, type CadDocument } from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import { sketchPointToWorldOnPlane } from '@occt-draw/sketch';
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
import { resolveActiveSketchTarget } from './sketchTargetContext';

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
                tool: { kind: 'midpoint-line', midpoint: null },
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

        if (session?.tool.kind === 'midpoint-line' && session.tool.midpoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'midpoint-line', midpoint: null },
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

    protected override onPointerCancel(): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    protected override onPointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'midpoint-line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!tool.midpoint) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'midpoint-line', midpoint: point },
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

    protected override onPointerMove(
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
        const tool = session?.tool.kind === 'midpoint-line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.midpoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        const segment = getMidpointLineSegment(tool.midpoint, point);

        if (!segment) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createMidpointLineDraft(target.plane, segment.start, segment.end),
        });
    }

    protected override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'midpoint-line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.midpoint || !target || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return this.clearPendingLineResult(context, session);
        }

        const segment = getMidpointLineSegment(tool.midpoint, point);

        if (!segment) {
            return this.clearPendingLineResult(context, session);
        }

        return this.createMidpointLineResult(context, session, point);
    }

    private createMidpointLineResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const midpoint = session.tool.kind === 'midpoint-line' ? session.tool.midpoint : null;

        if (!midpoint) {
            return createUnhandledCommandResult();
        }

        const segment = getMidpointLineSegment(midpoint, point);

        if (!segment) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'midpoint-line', midpoint: null },
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

    private clearPendingLineResult(
        context: CommandContext,
        session: SketchEditSession,
    ): CommandResult {
        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'midpoint-line', midpoint: null },
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
    plane: Plane3,
    event: CommandPointerEvent,
): Vector2 | null {
    return projectScreenPointToSketch2({
        camera: state.navigation.camera,
        plane,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
    });
}

function distanceScreenPoints(
    first: CommandPointerEvent['point'],
    second: CommandPointerEvent['point'],
): number {
    return Math.hypot(second.x - first.x, second.y - first.y);
}
