import type { DisplayModel } from '@occt-draw/display';
import type {
    DocumentTransaction,
    EditDraft,
    SelectionTarget,
    TransactionGroup,
} from '@occt-draw/core';
import type { EditorState } from '../state/editorState';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import type { CommandId } from './commandTypes';

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
    getDisplayModel(): DisplayModel;
    getDraft(): EditDraft | null;
    getState(): EditorState;
    pick(point: ScreenPoint): SelectionTarget | null;
    replaceDraft(draft: EditDraft | null): void;
    setMessage(message: string): void;
    setState(updater: (state: EditorState) => EditorState): void;
    commit(edit: DocumentTransaction | TransactionGroup): void;
}

export abstract class CadCommand {
    abstract readonly id: CommandId;

    enter(_context: CommandContext): void {
        return undefined;
    }

    exit(_context: CommandContext): void {
        return undefined;
    }

    cancel(_context: CommandContext): void {
        return undefined;
    }

    pointerDown(_event: CommandPointerEvent, _context: CommandContext): boolean {
        return false;
    }

    pointerMove(_event: CommandPointerEvent, _context: CommandContext): boolean {
        return false;
    }

    pointerUp(_event: CommandPointerEvent, _context: CommandContext): boolean {
        return false;
    }

    keyDown(_event: CommandKeyEvent, _context: CommandContext): boolean {
        return false;
    }
}
