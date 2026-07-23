import { AddCenterPointArcRequest, type CadDocument } from '@occt-draw/cad-model';
import { createEditDraft } from '@occt-draw/core';
import {
    Arc2,
    LineSegment3,
    Vec2,
    Vec3,
    CurveTessellator2,
    type Plane3,
    type Vector2,
} from '@occt-draw/math';
import { sampleSketchCurveSegments, sketchPointToWorldOnPlane } from '@occt-draw/sketch';
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

const CENTER_POINT_ARC_PREVIEW_SEGMENTS = 32;
const MIN_CENTER_POINT_ARC_RADIUS = 1e-6;
const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);

interface PendingCenterPointArcDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchCenterPointArcCommand extends CadCommand {
    public readonly id = 'sketch-center-arc';
    private pendingDrag: PendingCenterPointArcDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-center-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { centerPoint: null, kind: 'center-arc', startPoint: null },
            },
            commandSession: {
                id: 'sketch-center-arc',
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

        if (
            session?.tool.kind === 'center-arc' &&
            (session.tool.centerPoint || session.tool.startPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { centerPoint: null, kind: 'center-arc', startPoint: null },
                },
                commandSession: {
                    id: 'sketch-center-arc',
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
        const tool = session?.tool.kind === 'center-arc' ? session.tool : null;
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

        if (!tool.centerPoint) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { centerPoint: point, kind: 'center-arc', startPoint: null },
                },
                commandSession: {
                    id: 'sketch-center-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (!tool.startPoint) {
            if (!isValidRadius(tool.centerPoint, point)) {
                return createHandledCommandResult({
                    draft: null,
                    message: 'Sketch command updated.',
                });
            }

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        centerPoint: tool.centerPoint,
                        kind: 'center-arc',
                        startPoint: point,
                    },
                },
                commandSession: {
                    id: 'sketch-center-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: createRadiusCircleDraft(target.plane, tool.centerPoint, point),
            });
        }

        return this.createArcResult(context, session, tool.centerPoint, tool.startPoint, point);
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
        const tool = session?.tool.kind === 'center-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.centerPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (!tool.startPoint) {
            return createHandledCommandResult({
                draft: createRadiusCircleDraft(target.plane, tool.centerPoint, point),
            });
        }

        const arc = Arc2.fromCenterStartEndPoint(tool.centerPoint, tool.startPoint, point);

        if (!arc) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createArcDraft(target.plane, arc, [
                tool.centerPoint,
                tool.startPoint,
                arc.pointAt(1),
            ]),
        });
    }

    public override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'center-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.centerPoint || tool.startPoint || !target || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!isValidRadius(tool.centerPoint, point)) {
            return createHandledCommandResult({
                draft: null,
                message: 'Sketch command updated.',
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { centerPoint: tool.centerPoint, kind: 'center-arc', startPoint: point },
            },
            commandSession: {
                id: 'sketch-center-arc',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: createRadiusCircleDraft(target.plane, tool.centerPoint, point),
        });
    }

    private createArcResult(
        context: CommandContext,
        session: SketchEditSession,
        centerPoint: Vector2,
        startPoint: Vector2,
        endDirectionPoint: Vector2,
    ): CommandResult {
        if (!Arc2.fromCenterStartEndPoint(centerPoint, startPoint, endDirectionPoint)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { centerPoint: null, kind: 'center-arc', startPoint: null },
            },
            commandSession: {
                id: 'sketch-center-arc',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddCenterPointArcRequest({
                centerPoint,
                endDirectionPoint,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
                startPoint,
            }),
            draft: null,
        });
    }
}

function createRadiusCircleDraft(plane: Plane3, centerPoint: Vector2, radiusPoint: Vector2) {
    const radius = Vec2.distance(centerPoint, radiusPoint);

    if (!isValidRadius(centerPoint, radiusPoint)) {
        return null;
    }

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-center-arc',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleSketchCurveSegments(
            { center: centerPoint, kind: 'circle', radius },
            { segments: CENTER_POINT_ARC_PREVIEW_SEGMENTS * 2 },
        ).map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-center-arc:circle-segment:${String(index)}`,
            kind: 'line-segment' as const,
            lineStyle: 'construction' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        {
            color: DRAFT_COLOR,
            id: 'draft:sketch-center-arc:radius-line',
            kind: 'line-segment' as const,
            lineStyle: 'construction' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, centerPoint),
                sketchPointToWorldOnPlane(plane, radiusPoint),
            ),
            showEndpointPoints: false,
            visible: true,
        },
        ...[centerPoint, radiusPoint].map((point, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-center-arc:radius-point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function isValidRadius(centerPoint: Vector2, radiusPoint: Vector2): boolean {
    return Vec2.distance(centerPoint, radiusPoint) > MIN_CENTER_POINT_ARC_RADIUS;
}

function createArcDraft(plane: Plane3, arc: Arc2, definitionPoints: readonly Vector2[]) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-center-arc',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...CurveTessellator2.tessellate(arc, {
            closed: false,
            segments: CENTER_POINT_ARC_PREVIEW_SEGMENTS,
        }).map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-center-arc:arc-segment:${String(index)}`,
            kind: 'line-segment' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...definitionPoints.map((point, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-center-arc:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
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
