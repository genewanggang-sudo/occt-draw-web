import { createEditDraft } from '@occt-draw/core';
import { AddEllipticalArcRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    Coord2,
    Ellipse2,
    EllipticalArc2,
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

const ELLIPTICAL_ARC_REFERENCE_SEGMENTS = 64;
const ELLIPTICAL_ARC_SEGMENTS = 48;
const PROVISIONAL_MINOR_RADIUS_RATIO = 0.5;
const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);
const REFERENCE_COLOR = Vec3.of(0.45, 0.62, 0.85);

interface EllipseWithSecondaryAxisPoint {
    readonly ellipse: Ellipse2;
    readonly secondaryAxisPoint: Vector2;
}

export class SketchEllipticalArcCommand extends CadCommand {
    public readonly id = 'sketch-elliptical-arc';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-elliptical-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: createEmptyTool(),
            },
            commandSession: createRunningSession(state),
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (
            session?.tool.kind === 'elliptical-arc' &&
            (session.tool.centerPoint ||
                session.tool.primaryAxisPoint ||
                session.tool.secondaryPoint ||
                session.tool.startPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: createEmptyTool(),
                },
                commandSession: createRunningSession(state),
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
        return createHandledCommandResult({ draft: null });
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
        const tool = session?.tool.kind === 'elliptical-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({ message: 'Sketch command updated.' });
        }

        if (!tool.centerPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { ...createEmptyTool(), centerPoint: point },
                },
                commandSession: createRunningSession(state),
                draft: null,
            });
        }

        if (!tool.primaryAxisPoint) {
            const ellipse = createProvisionalEllipse(tool.centerPoint, point);

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        centerPoint: tool.centerPoint,
                        endAngleRadians: null,
                        kind: 'elliptical-arc',
                        primaryAxisPoint: point,
                        secondaryPoint: null,
                        startAngleRadians: null,
                        startPoint: null,
                    },
                },
                commandSession: createRunningSession(state),
                draft: createEllipticalArcDraft(target.plane, ellipse, null, [
                    tool.centerPoint,
                    point,
                ]),
            });
        }

        if (!tool.secondaryPoint) {
            const resolved = createEllipseWithSecondaryAxisPoint(
                tool.centerPoint,
                tool.primaryAxisPoint,
                point,
            );
            const ellipse = resolved?.ellipse ?? null;
            const secondaryPoint = resolved?.secondaryAxisPoint ?? point;
            const startPoint = ellipse ? projectPointToEllipse(ellipse, point) : secondaryPoint;
            const startAngle = ellipse?.angleOfPoint(startPoint) ?? null;

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        centerPoint: tool.centerPoint,
                        endAngleRadians: startAngle,
                        kind: 'elliptical-arc',
                        primaryAxisPoint: tool.primaryAxisPoint,
                        secondaryPoint,
                        startAngleRadians: startAngle,
                        startPoint,
                    },
                },
                commandSession: createRunningSession(state),
                draft: createEllipticalArcDraft(target.plane, ellipse, null, [
                    tool.centerPoint,
                    tool.primaryAxisPoint,
                    startPoint,
                ]),
            });
        }

        return this.createEllipticalArcResult(
            context,
            session,
            tool.centerPoint,
            tool.primaryAxisPoint,
            tool.secondaryPoint,
            tool.startPoint ?? tool.secondaryPoint,
            tool.startAngleRadians,
            tool.endAngleRadians,
            point,
        );
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'elliptical-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool?.centerPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        if (!tool.primaryAxisPoint) {
            return createHandledCommandResult({
                draft: createEllipticalArcDraft(
                    target.plane,
                    createProvisionalEllipse(tool.centerPoint, point),
                    null,
                    [tool.centerPoint, point],
                ),
            });
        }

        if (!tool.secondaryPoint) {
            const resolved = createEllipseWithSecondaryAxisPoint(
                tool.centerPoint,
                tool.primaryAxisPoint,
                point,
            );
            const ellipse = resolved?.ellipse ?? null;
            const previewPoint = ellipse ? projectPointToEllipse(ellipse, point) : point;

            return createHandledCommandResult({
                draft: createEllipticalArcDraft(
                    target.plane,
                    ellipse,
                    null,
                    [tool.centerPoint, tool.primaryAxisPoint, previewPoint],
                    [[tool.centerPoint, previewPoint]],
                ),
            });
        }

        const ellipse = Ellipse2.fromCenterAxisPoints(
            tool.centerPoint,
            tool.primaryAxisPoint,
            tool.secondaryPoint,
        );

        if (!ellipse) {
            return createHandledCommandResult({
                draft: null,
            });
        }

        const startPoint = tool.startPoint ?? tool.secondaryPoint;
        const endPoint = projectPointToEllipse(ellipse, point);
        const startAngle = tool.startAngleRadians ?? ellipse.angleOfPoint(startPoint);
        const endAngle = unwrapAngleNear(
            ellipse.angleOfPoint(endPoint),
            tool.endAngleRadians ?? startAngle,
        );
        const arc = createEllipticalArcFromAngles(ellipse, startAngle, endAngle);

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: {
                    ...tool,
                    endAngleRadians: endAngle,
                    startAngleRadians: startAngle,
                },
            },
            draft: createEllipticalArcDraft(target.plane, ellipse, arc, [
                tool.centerPoint,
                tool.primaryAxisPoint,
                startPoint,
                endPoint,
            ]),
        });
    }

    private createEllipticalArcResult(
        context: CommandContext,
        session: SketchEditSession,
        centerPoint: Vector2,
        primaryAxisPoint: Vector2,
        secondaryPoint: Vector2,
        startPoint: Vector2,
        startAngleRadians: number | null,
        previousEndAngleRadians: number | null,
        endPoint: Vector2,
    ): CommandResult {
        const ellipse = Ellipse2.fromCenterAxisPoints(
            centerPoint,
            primaryAxisPoint,
            secondaryPoint,
        );
        const projectedStartPoint = ellipse
            ? projectPointToEllipse(ellipse, startPoint)
            : startPoint;
        const projectedEndPoint = ellipse ? projectPointToEllipse(ellipse, endPoint) : endPoint;
        const startAngle = ellipse
            ? (startAngleRadians ?? ellipse.angleOfPoint(projectedStartPoint))
            : null;
        const endAngle =
            ellipse && startAngle !== null
                ? unwrapAngleNear(
                      ellipse.angleOfPoint(projectedEndPoint),
                      previousEndAngleRadians ?? startAngle,
                  )
                : null;

        if (!ellipse || startAngle === null || endAngle === null) {
            return createHandledCommandResult();
        }

        const arc = createEllipticalArcFromAngles(ellipse, startAngle, endAngle);

        if (!arc) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: createEmptyTool(),
            },
            commandSession: createRunningSession(state),
            documentRequest: new AddEllipticalArcRequest({
                centerPoint,
                endPoint: projectedEndPoint,
                partStudioId: state.document.getActivePartStudio().id,
                primaryAxisPoint,
                secondaryPoint,
                sketchFeatureId: session.sketchFeatureId,
                endAngleRadians: arc.endAngleRadians,
                startAngleRadians: arc.startAngleRadians,
                startPoint: projectedStartPoint,
            }),
            draft: null,
        });
    }
}

function createEllipticalArcDraft(
    plane: Plane3,
    ellipse: Ellipse2 | null,
    arc: EllipticalArc2 | null,
    definitionPoints: readonly Vector2[],
    axisSegments: readonly (readonly [Vector2, Vector2])[] = [],
) {
    if (!ellipse) {
        return null;
    }

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-elliptical-arc',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleCurveSegments2(ellipse, {
            closed: true,
            segments: ELLIPTICAL_ARC_REFERENCE_SEGMENTS,
        }).map((segment, index) => ({
            color: REFERENCE_COLOR,
            id: `draft:sketch-elliptical-arc:reference:${String(index)}`,
            kind: 'line-segment' as const,
            lineStyle: 'construction' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...axisSegments.map(([start, end], index) => ({
            color: REFERENCE_COLOR,
            id: `draft:sketch-elliptical-arc:axis:${String(index)}`,
            kind: 'line-segment' as const,
            lineStyle: 'construction' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, start),
                sketchPointToWorldOnPlane(plane, end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...(arc
            ? sampleCurveSegments2(arc, {
                  closed: false,
                  segments: ELLIPTICAL_ARC_SEGMENTS,
              }).map((segment, index) => ({
                  color: DRAFT_COLOR,
                  id: `draft:sketch-elliptical-arc:segment:${String(index)}`,
                  kind: 'line-segment' as const,
                  segment: new LineSegment3(
                      sketchPointToWorldOnPlane(plane, segment.start),
                      sketchPointToWorldOnPlane(plane, segment.end),
                  ),
                  showEndpointPoints: false,
                  visible: true,
              }))
            : []),
        ...definitionPoints.map((point, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-elliptical-arc:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function createEmptyTool() {
    return {
        centerPoint: null,
        endAngleRadians: null,
        kind: 'elliptical-arc' as const,
        primaryAxisPoint: null,
        secondaryPoint: null,
        startAngleRadians: null,
        startPoint: null,
    };
}

function createProvisionalEllipse(
    centerPoint: Vector2,
    primaryAxisPoint: Vector2,
): Ellipse2 | null {
    const center = Vec2.from(centerPoint);
    const primaryVector = center.vectorTo(primaryAxisPoint);
    const radius = primaryVector.length();

    if (radius <= 1e-6) {
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
        minorRadius: radius * PROVISIONAL_MINOR_RADIUS_RATIO,
    });

    return ellipse.isValid() ? ellipse : null;
}

function createEllipseWithSecondaryAxisPoint(
    centerPoint: Vector2,
    primaryAxisPoint: Vector2,
    secondaryPoint: Vector2,
): EllipseWithSecondaryAxisPoint | null {
    const center = Vec2.from(centerPoint);
    const primary = Vec2.from(primaryAxisPoint);
    const secondary = Vec2.from(secondaryPoint);
    const primaryVector = center.vectorTo(primary);

    if (primaryVector.length() <= 1e-6) {
        return null;
    }

    const yAxis = primaryVector.normalize().perpendicularLeft();
    const secondaryAxisPoint = center.translated(
        yAxis.scale(center.vectorTo(secondary).dot(yAxis)),
    );
    const ellipse = Ellipse2.fromCenterAxisPoints(
        centerPoint,
        primaryAxisPoint,
        secondaryAxisPoint,
    );

    return ellipse ? { ellipse, secondaryAxisPoint } : null;
}

function projectPointToEllipse(ellipse: Ellipse2, point: Vector2): Vector2 {
    return ellipse.pointAt(ellipse.angleOfPoint(point));
}

function createEllipticalArcFromAngles(
    ellipse: Ellipse2,
    startAngleRadians: number,
    endAngleRadians: number,
): EllipticalArc2 | null {
    if (!ellipse.isValid()) {
        return null;
    }

    const arc = new EllipticalArc2(ellipse, startAngleRadians, endAngleRadians);

    return arc.isValid() ? arc : null;
}

function unwrapAngleNear(angle: number, reference: number): number {
    const fullTurn = Math.PI * 2;
    let unwrapped = angle;

    while (unwrapped - reference <= -Math.PI) {
        unwrapped += fullTurn;
    }

    while (unwrapped - reference > Math.PI) {
        unwrapped -= fullTurn;
    }

    return unwrapped;
}

function createRunningSession(state: EditorState) {
    return {
        id: 'sketch-elliptical-arc' as const,
        message: 'Sketch command updated.',
        selectionContext: state.commandSession.selectionContext,
        status: 'running' as const,
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
