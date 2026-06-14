import { createEditDraft } from '@occt-draw/core';
import { AddClosedLineSegmentsRequest, type CadDocument } from '@occt-draw/cad-model';
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
                tool: { kind: 'aligned-rectangle', firstEdge: null },
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

        if (session?.tool.kind === 'aligned-rectangle' && session.tool.firstEdge) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'aligned-rectangle', firstEdge: null },
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

        if (session) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'select' },
                },
                commandSession: {
                    id: 'select',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'idle',
                },
                draft: null,
            });
        }

        return createHandledCommandResult({ draft: null });
    }

    public override exit(): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override onLeftDragCancel(
        _event: CommandPointerEvent,
        _context: CommandContext,
    ): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override onPointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'aligned-rectangle' ? session.tool : null;
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

        if (!tool.firstEdge) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        kind: 'aligned-rectangle',
                        firstEdge: { end: point, start: point },
                    },
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

        if (isAlignedRectangleFirstPoint(tool.firstEdge)) {
            return this.createFirstEdgeResult(context, session, point);
        }

        return this.createAlignedRectangleResult(context, session, point);
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (this.pendingDrag?.pointerId === event.pointerId && !this.pendingDrag.moved) {
            this.pendingDrag = {
                ...this.pendingDrag,
                moved: true,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'aligned-rectangle' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.firstEdge || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (isAlignedRectangleFirstPoint(tool.firstEdge)) {
            return createHandledCommandResult({
                draft: createLineDraft(target.plane, tool.firstEdge.start, point),
            });
        }

        const corners = getAlignedRectangleCorners(tool.firstEdge, point);

        if (!corners) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createRectangleDraft(target.plane, corners),
        });
    }

    public override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'aligned-rectangle' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (
            !session ||
            !tool?.firstEdge ||
            !isAlignedRectangleFirstPoint(tool.firstEdge) ||
            !target ||
            !drag?.moved
        ) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return this.clearPendingAlignedRectangleResult(context, session);
        }

        return this.createFirstEdgeResult(context, session, point, { clearOnInvalid: true });
    }

    private createFirstEdgeResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
        options: { readonly clearOnInvalid: boolean } = { clearOnInvalid: false },
    ): CommandResult {
        const state = context.getState();
        const firstEdge = session.tool.kind === 'aligned-rectangle' ? session.tool.firstEdge : null;
        const start = firstEdge && isAlignedRectangleFirstPoint(firstEdge) ? firstEdge.start : null;

        if (!start || Vec2.distance(start, point) <= MIN_RECTANGLE_SIDE) {
            if (options.clearOnInvalid) {
                return this.clearPendingAlignedRectangleResult(context, session);
            }

            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'aligned-rectangle', firstEdge: { end: point, start } },
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
        const firstEdge =
            session.tool.kind === 'aligned-rectangle' && session.tool.firstEdge
                ? session.tool.firstEdge
                : null;

        if (!firstEdge || isAlignedRectangleFirstPoint(firstEdge)) {
            return createUnhandledCommandResult();
        }

        const corners = getAlignedRectangleCorners(firstEdge, point);

        if (!corners) {
            return this.clearPendingAlignedRectangleResult(context, session);
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'aligned-rectangle', firstEdge: null },
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

    private clearPendingAlignedRectangleResult(
        context: CommandContext,
        session: SketchEditSession,
    ): CommandResult {
        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'aligned-rectangle', firstEdge: null },
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

function isAlignedRectangleFirstPoint(edge: {
    readonly end: Vector2;
    readonly start: Vector2;
}): boolean {
    return edge.start.x === edge.end.x && edge.start.y === edge.end.y;
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
