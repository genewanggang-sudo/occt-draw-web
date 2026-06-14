import { createEditDraft } from '@occt-draw/core';
import { AddThreePointCircleRequest, type CadDocument } from '@occt-draw/cad-model';
import { Circle2, LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
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

const MIN_THREE_POINT_CIRCLE_RADIUS = 1e-6;

export class SketchThreePointCircleCommand extends CadCommand {
    public readonly id = 'sketch-3-point-circle';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-3-point-circle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { firstPoint: null, kind: 'three-point-circle', secondPoint: null },
            },
            commandSession: {
                id: 'sketch-3-point-circle',
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

        if (
            session?.tool.kind === 'three-point-circle' &&
            (session.tool.firstPoint || session.tool.secondPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { firstPoint: null, kind: 'three-point-circle', secondPoint: null },
                },
                commandSession: {
                    id: 'sketch-3-point-circle',
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
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override onLeftDragCancel(
        _event: CommandPointerEvent,
        _context: CommandContext,
    ): CommandResult {
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
        const tool = session?.tool.kind === 'three-point-circle' ? session.tool : null;
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

        if (!tool.firstPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { firstPoint: point, kind: 'three-point-circle', secondPoint: null },
                },
                commandSession: {
                    id: 'sketch-3-point-circle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (!tool.secondPoint) {
            const center = Vec2.lerp(tool.firstPoint, point, 0.5);
            const radius = Vec2.distance(tool.firstPoint, point) / 2;

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        firstPoint: tool.firstPoint,
                        kind: 'three-point-circle',
                        secondPoint: point,
                    },
                },
                commandSession: {
                    id: 'sketch-3-point-circle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                ...(radius > MIN_THREE_POINT_CIRCLE_RADIUS
                    ? {
                          draft: createCircleDraft(target.plane, center, radius, [
                              tool.firstPoint,
                              point,
                          ]),
                      }
                    : {}),
            });
        }

        return this.createCircleResult(context, session, tool.firstPoint, tool.secondPoint, point);
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'three-point-circle' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.firstPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (!tool.secondPoint) {
            const center = Vec2.lerp(tool.firstPoint, point, 0.5);
            const radius = Vec2.distance(tool.firstPoint, point) / 2;

            if (radius <= MIN_THREE_POINT_CIRCLE_RADIUS) {
                return createHandledCommandResult({
                    draft: null,
                });
            }

            return createHandledCommandResult({
                draft: createCircleDraft(target.plane, center, radius, [tool.firstPoint, point]),
            });
        }

        const circle = Circle2.fromThreePoints(tool.firstPoint, tool.secondPoint, point);

        if (!circle) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createCircleDraft(target.plane, circle.center, circle.radius, [
                tool.firstPoint,
                tool.secondPoint,
                point,
            ]),
        });
    }

    private createCircleResult(
        context: CommandContext,
        session: SketchEditSession,
        firstPoint: Vector2,
        secondPoint: Vector2,
        thirdPoint: Vector2,
    ): CommandResult {
        if (!Circle2.fromThreePoints(firstPoint, secondPoint, thirdPoint)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { firstPoint: null, kind: 'three-point-circle', secondPoint: null },
            },
            commandSession: {
                id: 'sketch-3-point-circle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddThreePointCircleRequest({
                firstPoint,
                partStudioId: state.document.getActivePartStudio().id,
                secondPoint,
                sketchFeatureId: session.sketchFeatureId,
                thirdPoint,
            }),
            draft: null,
        });
    }
}

function createCircleDraft(
    plane: Plane3,
    center: Vector2,
    radius: number,
    definitionPoints: readonly Vector2[],
) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-3-point-circle',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleSketchCurveSegments({ center, kind: 'circle', radius }).map((segment, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-3-point-circle:segment:${String(index)}`,
            kind: 'line-segment' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...definitionPoints.map((point, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-3-point-circle:point:${String(index)}`,
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
