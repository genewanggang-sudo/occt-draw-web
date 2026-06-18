import { createEditDraft } from '@occt-draw/core';
import { AddFitSplineRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    FitSpline2,
    LineSegment3,
    Vec2,
    Vec3,
    sampleCurveSegments2,
    type Plane3,
    type Vector2,
} from '@occt-draw/math';
import { sketchPointToWorldOnPlane } from '@occt-draw/sketch';
import type { EditorState } from '../state/editorState';
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

const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);
const SPLINE_PREVIEW_SEGMENTS = 64;

export class SketchSplineCommand extends CadCommand {
    public readonly id = 'sketch-spline';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: createBlockedSession(state),
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { fitPoints: [], kind: 'spline' },
            },
            commandSession: createRunningSession(state),
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (session?.tool.kind === 'spline' && session.tool.fitPoints.length > 0) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { fitPoints: [], kind: 'spline' },
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

    public override onClick(event: CommandPointerEvent, context: CommandContext): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'spline' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({ message: 'Sketch command updated.' });
        }

        const fitPoints = appendDistinctPoint(tool.fitPoints, point);

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { fitPoints, kind: 'spline' },
            },
            commandSession: createRunningSession(state),
            draft: createSplineDraft(target.plane, fitPoints),
        });
    }

    public override onDoubleClick(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'spline' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);
        const fitPoints = point ? appendDistinctPoint(tool.fitPoints, point) : tool.fitPoints;

        if (fitPoints.length < 3 || !FitSpline2.fromFitPoints({ fitPoints }).success) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { fitPoints, kind: 'spline' },
                },
                commandSession: createRunningSession(state),
                draft: createSplineDraft(target.plane, fitPoints),
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { fitPoints: [], kind: 'spline' },
            },
            commandSession: createRunningSession(state),
            documentRequest: new AddFitSplineRequest({
                fitPoints,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'spline' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.fitPoints.length || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createSplineDraft(target.plane, appendDistinctPoint(tool.fitPoints, point)),
        });
    }
}

function createSplineDraft(plane: Plane3, fitPoints: readonly Vector2[]) {
    const spline = FitSpline2.fromFitPoints({ fitPoints }).value;
    const segments = spline
        ? sampleCurveSegments2(spline, {
              closed: false,
              segments: SPLINE_PREVIEW_SEGMENTS,
          })
        : [];

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-spline',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...segments.map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-spline:segment:${String(index)}`,
            kind: 'line-segment' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...fitPoints.map((point, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-spline:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function appendDistinctPoint(points: readonly Vector2[], point: Vector2): readonly Vector2[] {
    const last = points[points.length - 1];

    return last && Vec2.distance(last, point) <= 1e-6 ? points : [...points, point];
}

function createBlockedSession(state: EditorState) {
    return {
        id: 'sketch-spline' as const,
        message: 'Sketch command updated.',
        selectionContext: state.commandSession.selectionContext,
        status: 'blocked' as const,
    };
}

function createRunningSession(state: EditorState) {
    return {
        id: 'sketch-spline' as const,
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
