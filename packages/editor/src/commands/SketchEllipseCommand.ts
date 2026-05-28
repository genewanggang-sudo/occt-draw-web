import { createEditDraft } from '@occt-draw/core';
import { AddEllipseRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    Coord2,
    Ellipse2,
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

const MIN_ELLIPSE_RADIUS = 1e-6;
const ELLIPSE_PREVIEW_SEGMENTS = 64;

export class SketchEllipseCommand extends CadCommand {
    public readonly id = 'sketch-ellipse';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { centerPoint: null, kind: 'ellipse', primaryAxisPoint: null },
            },
            commandSession: {
                id: 'sketch-ellipse',
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
            session?.tool.kind === 'ellipse' &&
            (session.tool.centerPoint || session.tool.primaryAxisPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { centerPoint: null, kind: 'ellipse', primaryAxisPoint: null },
                },
                commandSession: {
                    id: 'sketch-ellipse',
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
        return createHandledCommandResult({
            draft: null,
        });
    }

    protected override onPointerCancel(): CommandResult {
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
        const tool = session?.tool.kind === 'ellipse' ? session.tool : null;
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
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { centerPoint: point, kind: 'ellipse', primaryAxisPoint: null },
                },
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (!tool.primaryAxisPoint) {
            const ellipse = createEqualRadiusEllipse(tool.centerPoint, point);

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        centerPoint: tool.centerPoint,
                        kind: 'ellipse',
                        primaryAxisPoint: point,
                    },
                },
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                ...(ellipse
                    ? {
                          draft: createEllipseDraft(target.plane, ellipse, [
                              tool.centerPoint,
                              point,
                          ]),
                      }
                    : {}),
            });
        }

        return this.createEllipseResult(
            context,
            session,
            tool.centerPoint,
            tool.primaryAxisPoint,
            point,
        );
    }

    protected override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'ellipse' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.centerPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (!tool.primaryAxisPoint) {
            const ellipse = createEqualRadiusEllipse(tool.centerPoint, point);

            if (!ellipse) {
                return createHandledCommandResult({
                    draft: null,
                });
            }

            return createHandledCommandResult({
                draft: createEllipseDraft(target.plane, ellipse, [tool.centerPoint, point]),
            });
        }

        const ellipse = Ellipse2.fromCenterAxisPoints(
            tool.centerPoint,
            tool.primaryAxisPoint,
            point,
        );

        if (!ellipse) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        return createHandledCommandResult({
            draft: createEllipseDraft(target.plane, ellipse, [
                tool.centerPoint,
                tool.primaryAxisPoint,
                point,
            ]),
        });
    }

    private createEllipseResult(
        context: CommandContext,
        session: SketchEditSession,
        centerPoint: Vector2,
        primaryAxisPoint: Vector2,
        secondaryPoint: Vector2,
    ): CommandResult {
        if (!Ellipse2.fromCenterAxisPoints(centerPoint, primaryAxisPoint, secondaryPoint)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { centerPoint: null, kind: 'ellipse', primaryAxisPoint: null },
            },
            commandSession: {
                id: 'sketch-ellipse',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddEllipseRequest({
                centerPoint,
                partStudioId: state.document.getActivePartStudio().id,
                primaryAxisPoint,
                secondaryPoint,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }
}

function createEllipseDraft(
    plane: Plane3,
    ellipse: Ellipse2,
    definitionPoints: readonly Vector2[],
) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-ellipse',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleCurveSegments2(ellipse, { closed: true, segments: ELLIPSE_PREVIEW_SEGMENTS }).map(
            (segment, index) => ({
                color: Vec3.of(0.1, 0.55, 1),
                id: `draft:sketch-ellipse:segment:${String(index)}`,
                kind: 'line-segment' as const,
                segment: new LineSegment3(
                    sketchPointToWorldOnPlane(plane, segment.start),
                    sketchPointToWorldOnPlane(plane, segment.end),
                ),
                showEndpointPoints: false,
                visible: true,
            }),
        ),
        ...definitionPoints.map((point, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-ellipse:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function createEqualRadiusEllipse(
    centerPoint: Vector2,
    primaryAxisPoint: Vector2,
): Ellipse2 | null {
    const center = Vec2.from(centerPoint);
    const primaryVector = center.vectorTo(primaryAxisPoint);
    const radius = primaryVector.length();

    if (radius <= MIN_ELLIPSE_RADIUS) {
        return null;
    }

    const xAxis = primaryVector.normalize();
    const ellipse = new Ellipse2({
        coord: new Coord2({
            origin: center,
            xAxis,
            yAxis: xAxis.perpendicularLeft(),
        }),
        majorRadius: radius,
        minorRadius: radius,
    });

    return ellipse.isValid() ? ellipse : null;
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
