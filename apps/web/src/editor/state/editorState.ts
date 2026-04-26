import type { CadDocument } from '@occt-draw/core';
import type { CommandState } from '../commands/commandTypes';

export interface SelectionState {
    readonly selectedObjectIds: readonly string[];
}

export interface EditorState {
    readonly activeCommand: CommandState;
    readonly document: CadDocument;
    readonly selection: SelectionState;
}
