import type { EditDraft, Request, SelectionTarget } from '@occt-draw/core';
import type { CadDocument } from '@occt-draw/cad-model';
import {
    PlatformCommand,
    createHandledPlatformCommandResult,
    createUnhandledPlatformCommandResult,
    type PlatformCommandKeyEvent,
    type PlatformCommandPointerEvent,
    type PlatformCommandResult,
    type ScreenPoint,
    type SelectionState,
    type ViewNavigationState,
} from '@occt-draw/platform';
import type { EditorState, SketchEditSession } from '../state/editorState';
import type { CommandId, CommandSession } from './commandTypes';

export type CommandPointerEvent = PlatformCommandPointerEvent<ScreenPoint>;

export type CommandKeyEvent = PlatformCommandKeyEvent;

export interface CommandContext {
    getDraft(): EditDraft<CadDocument> | null;
    getState(): EditorState;
    pick(point: ScreenPoint): SelectionTarget | null;
}

export interface CommandResult extends PlatformCommandResult {
    readonly handled: boolean;
    readonly commandSession?: CommandSession;
    readonly documentRequest?: Request<CadDocument, unknown>;
    readonly draft?: EditDraft<CadDocument> | null;
    readonly message?: string;
    readonly navigation?: ViewNavigationState;
    readonly nextCommandId?: CommandId;
    readonly selection?: SelectionState;
    readonly activeSketchSession?: SketchEditSession | null;
}

export abstract class CadCommand extends PlatformCommand {
    public abstract override readonly id: CommandId;

    public enter(_context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public exit(_context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public cancel(_context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public pointerDown(_event: CommandPointerEvent, _context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public pointerCancel(_event: CommandPointerEvent, _context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public pointerMove(_event: CommandPointerEvent, _context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public pointerUp(_event: CommandPointerEvent, _context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }

    public keyDown(_event: CommandKeyEvent, _context: CommandContext): CommandResult {
        return createUnhandledCommandResult();
    }
}

export function createHandledCommandResult(
    result: Omit<CommandResult, 'handled'> = {},
): CommandResult {
    return createHandledPlatformCommandResult(result);
}

export function createUnhandledCommandResult(): CommandResult {
    return createUnhandledPlatformCommandResult();
}

export function mergeCommandResults(first: CommandResult, second: CommandResult): CommandResult {
    if (!first.handled) {
        return second;
    }

    if (!second.handled) {
        return first;
    }

    const commandSession = second.commandSession ?? first.commandSession;
    const documentRequest = second.documentRequest ?? first.documentRequest;
    const message = second.message ?? first.message;
    const navigation = second.navigation ?? first.navigation;
    const nextCommandId = second.nextCommandId ?? first.nextCommandId;
    const selection = second.selection ?? first.selection;
    const activeSketchSession =
        'activeSketchSession' in second ? second.activeSketchSession : first.activeSketchSession;
    const merged: CommandResult = {
        handled: true,
        ...(commandSession ? { commandSession } : {}),
        ...(documentRequest ? { documentRequest } : {}),
        ...(message ? { message } : {}),
        ...(navigation ? { navigation } : {}),
        ...(nextCommandId ? { nextCommandId } : {}),
        ...(selection ? { selection } : {}),
        ...('activeSketchSession' in second || 'activeSketchSession' in first
            ? { activeSketchSession }
            : {}),
    };

    if ('draft' in second) {
        return {
            ...merged,
            draft: second.draft,
        };
    }

    if ('draft' in first) {
        return {
            ...merged,
            draft: first.draft,
        };
    }

    return merged;
}
