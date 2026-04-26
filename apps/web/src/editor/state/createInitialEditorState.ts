import { createDefaultCadDocument } from '@occt-draw/core';
import { createInitialCommandState } from '../commands/commandReducer';
import { createInitialSelectionState } from '../selection/selectionState';
import type { EditorState } from './editorState';

export function createInitialEditorState(): EditorState {
    return {
        document: createDefaultCadDocument(),
        activeCommand: createInitialCommandState(),
        selection: createInitialSelectionState(),
    };
}
