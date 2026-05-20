import type { CadDocument } from '@occt-draw/cad-model';
import { createInitialSelectionState, type ViewNavigationState } from '@occt-draw/platform';
import { createInitialCommandSession } from '../commands/commandReducer';
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
        activeSketchSession: null,
        document,
        commandSession: createInitialCommandSession(),
        draft: null,
        navigation,
        selection: createInitialSelectionState(),
    };
}
