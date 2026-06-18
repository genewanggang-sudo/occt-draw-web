import { AddSketchPointRequest } from '@occt-draw/cad-model';
import type { Plane3, Vector2 } from '@occt-draw/math';
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

export class SketchPointCommand extends CadCommand {
    public readonly id = 'sketch-point';

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
                tool: { kind: 'point' },
            },
            commandSession: createRunningSession(state),
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

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
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (session?.tool.kind !== 'point' || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({ message: 'Sketch command updated.' });
        }

        return createSketchPointResult(state, session, point);
    }
}

function createSketchPointResult(
    state: EditorState,
    session: SketchEditSession,
    position: Vector2,
): CommandResult {
    return createHandledCommandResult({
        activeSketchSession: {
            ...session,
            tool: { kind: 'point' },
        },
        commandSession: createRunningSession(state),
        documentRequest: new AddSketchPointRequest({
            partStudioId: state.document.getActivePartStudio().id,
            position,
            sketchFeatureId: session.sketchFeatureId,
        }),
        draft: null,
    });
}

function createBlockedSession(state: EditorState) {
    return {
        id: 'sketch-point' as const,
        message: 'Sketch command updated.',
        selectionContext: state.commandSession.selectionContext,
        status: 'blocked' as const,
    };
}

function createRunningSession(state: EditorState) {
    return {
        id: 'sketch-point' as const,
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
