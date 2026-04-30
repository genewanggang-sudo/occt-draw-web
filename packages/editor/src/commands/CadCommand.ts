import type { RenderScene } from '@occt-draw/cad-rendering';
import type {
    DocumentTransaction,
    EditDraft,
    SelectionTarget,
    TransactionGroup,
} from '@occt-draw/core';
import type { EditorState, SketchDocumentStore, SketchEditSession } from '../state/editorState';
import type { SelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import type { CommandId, CommandSession } from './commandTypes';

export interface CommandPointerEvent {
    readonly button: number;
    readonly buttons: number;
    readonly ctrlKey: boolean;
    readonly point: ScreenPoint;
    readonly pointerId: number;
}

export interface CommandKeyEvent {
    readonly key: string;
}

export interface CommandContext {
    getRenderScene(): RenderScene;
    getDraft(): EditDraft | null;
    getState(): EditorState;
    pick(point: ScreenPoint): SelectionTarget | null;
}

export interface CommandResult {
    readonly handled: boolean;
    readonly commandSession?: CommandSession;
    readonly documentEdit?: DocumentTransaction | TransactionGroup;
    readonly draft?: EditDraft | null;
    readonly message?: string;
    readonly navigation?: ViewNavigationState;
    readonly nextCommandId?: CommandId;
    readonly selection?: SelectionState;
    readonly sketches?: SketchDocumentStore;
    readonly activeSketchSession?: SketchEditSession | null;
}

export abstract class CadCommand {
    public abstract readonly id: CommandId;

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
    return {
        ...result,
        handled: true,
    };
}

export function createUnhandledCommandResult(): CommandResult {
    return {
        handled: false,
    };
}

export function mergeCommandResults(first: CommandResult, second: CommandResult): CommandResult {
    if (!first.handled) {
        return second;
    }

    if (!second.handled) {
        return first;
    }

    const commandSession = second.commandSession ?? first.commandSession;
    const documentEdit = second.documentEdit ?? first.documentEdit;
    const message = second.message ?? first.message;
    const navigation = second.navigation ?? first.navigation;
    const nextCommandId = second.nextCommandId ?? first.nextCommandId;
    const selection = second.selection ?? first.selection;
    const sketches = second.sketches ?? first.sketches;
    const activeSketchSession =
        'activeSketchSession' in second ? second.activeSketchSession : first.activeSketchSession;
    const merged: CommandResult = {
        handled: true,
        ...(commandSession ? { commandSession } : {}),
        ...(documentEdit ? { documentEdit } : {}),
        ...(message ? { message } : {}),
        ...(navigation ? { navigation } : {}),
        ...(nextCommandId ? { nextCommandId } : {}),
        ...(selection ? { selection } : {}),
        ...(sketches ? { sketches } : {}),
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
