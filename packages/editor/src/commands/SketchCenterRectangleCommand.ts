import { createEditDraft } from '@occt-draw/core';
import { AddCornerRectangleRequest, type CadDocument } from '@occt-draw/cad-model';
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
                tool: { kind: 'center-rectangle', center: null },
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

        if (session?.tool.kind === 'center-rectangle' && session.tool.center) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'center-rectangle', center: null },
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
        const tool = session?.tool.kind === 'center-rectangle' ? session.tool : null;
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

        if (!tool.center) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'center-rectangle', center: point },
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

    protected override onPointerMove(
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
        const tool = session?.tool.kind === 'center-rectangle' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.center || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        const rectangle = getCenterRectangleCorners(
            tool.center,
            event.modifiers.alt ? constrainCornerToSquare(tool.center, point) : point,
        );

        if (!rectangle) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createRectangleDraft(
                target.plane,
                rectangle.firstCorner,
                rectangle.oppositeCorner,
            ),
        });
    }

    protected override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'center-rectangle' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.center || !target || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return this.clearPendingRectangleResult(context, session);
        }

        const rectangle = getCenterRectangleCorners(
            tool.center,
            event.modifiers.alt ? constrainCornerToSquare(tool.center, point) : point,
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
        const center = session.tool.kind === 'center-rectangle' ? session.tool.center : null;

        if (!center) {
            return createUnhandledCommandResult();
        }

        const rectangle = getCenterRectangleCorners(
            center,
            event.modifiers.alt ? constrainCornerToSquare(center, point) : point,
        );

        if (!rectangle) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'center-rectangle', center: null },
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
                tool: { kind: 'center-rectangle', center: null },
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
