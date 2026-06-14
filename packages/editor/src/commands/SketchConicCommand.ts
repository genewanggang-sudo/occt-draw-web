import { createEditDraft } from '@occt-draw/core';
import { AddConicRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    Conic2,
    DEFAULT_CONIC_RHO,
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

const CONIC_PREVIEW_SEGMENTS = 48;
const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);

export class SketchConicCommand extends CadCommand {
    public readonly id = 'sketch-conic';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-conic',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { endPoint: null, kind: 'conic', startPoint: null },
            },
            commandSession: {
                id: 'sketch-conic',
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

        if (session?.tool.kind === 'conic' && (session.tool.startPoint || session.tool.endPoint)) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { endPoint: null, kind: 'conic', startPoint: null },
                },
                commandSession: {
                    id: 'sketch-conic',
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
        const tool = session?.tool.kind === 'conic' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({ message: 'Sketch command updated.' });
        }

        if (!tool.startPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { endPoint: null, kind: 'conic', startPoint: point },
                },
                commandSession: createRunningSession(state),
                draft: null,
            });
        }

        if (!tool.endPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { endPoint: point, kind: 'conic', startPoint: tool.startPoint },
                },
                commandSession: createRunningSession(state),
                draft: createConicDraft(
                    target.plane,
                    createProvisionalConic(tool.startPoint, point),
                    [tool.startPoint, point],
                ),
            });
        }

        return this.createConicResult(context, session, tool.startPoint, tool.endPoint, point);
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'conic' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.startPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        const conic = tool.endPoint
            ? Conic2.fromThreePoints(tool.startPoint, tool.endPoint, point, DEFAULT_CONIC_RHO)
            : createProvisionalConic(tool.startPoint, point);

        return createHandledCommandResult({
            draft: createConicDraft(
                target.plane,
                conic,
                tool.endPoint ? [tool.startPoint, tool.endPoint, point] : [tool.startPoint, point],
            ),
        });
    }

    private createConicResult(
        context: CommandContext,
        session: SketchEditSession,
        startPoint: Vector2,
        endPoint: Vector2,
        shoulderPoint: Vector2,
    ): CommandResult {
        if (!Conic2.fromThreePoints(startPoint, endPoint, shoulderPoint, DEFAULT_CONIC_RHO)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { endPoint: null, kind: 'conic', startPoint: null },
            },
            commandSession: createRunningSession(state),
            documentRequest: new AddConicRequest({
                endPoint,
                partStudioId: state.document.getActivePartStudio().id,
                rho: DEFAULT_CONIC_RHO,
                shoulderPoint,
                sketchFeatureId: session.sketchFeatureId,
                startPoint,
            }),
            draft: null,
        });
    }
}

function createConicDraft(
    plane: Plane3,
    conic: Conic2 | null,
    definitionPoints: readonly Vector2[],
) {
    if (!conic) {
        return null;
    }

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-conic',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleCurveSegments2(conic, {
            closed: false,
            segments: CONIC_PREVIEW_SEGMENTS,
        }).map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-conic:segment:${String(index)}`,
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
            id: `draft:sketch-conic:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function createProvisionalConic(startPoint: Vector2, endPoint: Vector2): Conic2 | null {
    const chord = Vec2.from(startPoint).vectorTo(endPoint);

    if (chord.length() <= 1e-6) {
        return null;
    }

    const shoulderPoint = Vec2.from(startPoint)
        .translated(chord.scale(0.5))
        .translated(chord.perpendicularLeft().scale(0.25));

    return Conic2.fromThreePoints(startPoint, endPoint, shoulderPoint, DEFAULT_CONIC_RHO);
}

function createRunningSession(state: EditorState) {
    return {
        id: 'sketch-conic' as const,
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
