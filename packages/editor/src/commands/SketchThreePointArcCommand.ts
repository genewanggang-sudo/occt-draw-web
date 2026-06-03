import { createEditDraft } from '@occt-draw/core';
import { AddThreePointArcRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    Angle,
    Arc2,
    Circle2,
    LineSegment3,
    Vec2,
    Vec3,
    sampleCurveSegments2,
    type Plane3,
    type Vector2,
} from '@occt-draw/math';
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

const THREE_POINT_ARC_PREVIEW_SEGMENTS = 32;
const THREE_POINT_ARC_DRAG_THRESHOLD_PIXELS = 3;
const MIN_THREE_POINT_ARC_PREVIEW_RADIUS = 1e-6;
const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);

interface PendingThreePointArcDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchThreePointArcCommand extends CadCommand {
    public readonly id = 'sketch-3-point-arc';
    private pendingDrag: PendingThreePointArcDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-3-point-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { endPoint: null, kind: 'three-point-arc', startPoint: null },
            },
            commandSession: {
                id: 'sketch-3-point-arc',
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
            session?.tool.kind === 'three-point-arc' &&
            (session.tool.startPoint || session.tool.endPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { endPoint: null, kind: 'three-point-arc', startPoint: null },
                },
                commandSession: {
                    id: 'sketch-3-point-arc',
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
        const tool = session?.tool.kind === 'three-point-arc' ? session.tool : null;
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

        if (!tool.startPoint) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { endPoint: null, kind: 'three-point-arc', startPoint: point },
                },
                commandSession: {
                    id: 'sketch-3-point-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (!tool.endPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        endPoint: point,
                        kind: 'three-point-arc',
                        startPoint: tool.startPoint,
                    },
                },
                commandSession: {
                    id: 'sketch-3-point-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: createInitialArcDraft(target.plane, tool.startPoint, point),
            });
        }

        return this.createArcResult(context, session, tool.startPoint, tool.endPoint, point);
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
                    THREE_POINT_ARC_DRAG_THRESHOLD_PIXELS,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'three-point-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.startPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (!tool.endPoint) {
            return createHandledCommandResult({
                draft: createInitialArcDraft(target.plane, tool.startPoint, point),
            });
        }

        const arc = Arc2.fromStartEndRadiusPoint(tool.startPoint, tool.endPoint, point);

        if (!arc) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createArcDraft(target.plane, arc, [
                tool.startPoint,
                tool.endPoint,
                arc.circle.center,
            ]),
        });
    }

    protected override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'three-point-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.startPoint || tool.endPoint || !target || !drag?.moved) {
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

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { endPoint: point, kind: 'three-point-arc', startPoint: tool.startPoint },
            },
            commandSession: {
                id: 'sketch-3-point-arc',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: createInitialArcDraft(target.plane, tool.startPoint, point),
        });
    }

    private createArcResult(
        context: CommandContext,
        session: SketchEditSession,
        startPoint: Vector2,
        endPoint: Vector2,
        radiusPoint: Vector2,
    ): CommandResult {
        if (!Arc2.fromStartEndRadiusPoint(startPoint, endPoint, radiusPoint)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { endPoint: null, kind: 'three-point-arc', startPoint: null },
            },
            commandSession: {
                id: 'sketch-3-point-arc',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddThreePointArcRequest({
                endPoint,
                partStudioId: state.document.getActivePartStudio().id,
                radiusPoint,
                sketchFeatureId: session.sketchFeatureId,
                startPoint,
            }),
            draft: null,
        });
    }
}

function createArcDraft(plane: Plane3, arc: Arc2, definitionPoints: readonly Vector2[]) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-3-point-arc',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleCurveSegments2(arc, {
            closed: false,
            segments: THREE_POINT_ARC_PREVIEW_SEGMENTS,
        }).map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-3-point-arc:segment:${String(index)}`,
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
            id: `draft:sketch-3-point-arc:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function createInitialArcDraft(plane: Plane3, startPoint: Vector2, currentPoint: Vector2) {
    const chord = Vec2.from(startPoint).vectorTo(currentPoint);
    const center = Vec2.from(startPoint)
        .translated(chord.scale(0.5))
        .translated(chord.perpendicularLeft().scale(-0.5));
    const radius = center.distanceTo(startPoint);

    if (radius <= MIN_THREE_POINT_ARC_PREVIEW_RADIUS) {
        return null;
    }

    const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
    const currentAngle = Math.atan2(currentPoint.y - center.y, currentPoint.x - center.x);
    const arc = new Arc2(
        new Circle2(center, radius),
        Angle.fromRadians(startAngle),
        Angle.fromRadians(startAngle + normalizeAngleDelta(currentAngle - startAngle)),
    );

    return createArcDraft(plane, arc, [startPoint, currentPoint, center]);
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

function normalizeAngleDelta(delta: number): number {
    const fullTurn = Math.PI * 2;
    let normalized = delta;

    while (normalized <= -Math.PI) {
        normalized += fullTurn;
    }

    while (normalized > Math.PI) {
        normalized -= fullTurn;
    }

    return normalized;
}

function distanceScreenPoints(
    first: CommandPointerEvent['point'],
    second: CommandPointerEvent['point'],
): number {
    return Math.hypot(second.x - first.x, second.y - first.y);
}
