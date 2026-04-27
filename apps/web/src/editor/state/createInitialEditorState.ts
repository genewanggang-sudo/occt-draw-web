import type { CadDocument } from '@occt-draw/core';
import { createInitialCommandSession } from '../commands/commandReducer';
import { createInitialSelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';
import type { EditorState } from './editorState';

interface CreateInitialEditorStateInput {
    readonly document: CadDocument;
    readonly navigation: ViewNavigationState;
}

export function createInitialEditorState({
    document,
    navigation,
}: CreateInitialEditorStateInput): EditorState {
    return {
        document,
        commandSession: createInitialCommandSession(),
        draft: null,
        navigation,
        selection: createInitialSelectionState(),
    };
}
