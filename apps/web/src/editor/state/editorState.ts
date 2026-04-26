import type { CadDocument } from '@occt-draw/core';
import type { CommandState } from '../commands/commandTypes';
import type { SelectionState } from '../selection/selectionState';

export interface EditorState {
    readonly activeCommand: CommandState;
    readonly document: CadDocument;
    readonly selection: SelectionState;
}
