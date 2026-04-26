import { createDefaultCadDocument } from '@occt-draw/core';
import { createInitialCommandState } from '../commands/commandReducer';
import type { EditorState } from './editorState';

export function createInitialEditorState(): EditorState {
    return {
        document: createDefaultCadDocument(),
        activeCommand: createInitialCommandState(),
        selection: {
            selectedObjectIds: [],
        },
    };
}
