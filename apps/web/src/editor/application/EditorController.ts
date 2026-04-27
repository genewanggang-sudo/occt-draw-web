import {
    editCadDocument,
    type DocumentEdit,
    type EditDraft,
    type SelectionTarget,
} from '@occt-draw/core';
import {
    activateCommandSession,
    cancelCommandSession,
    completeCommandSession,
    consumeSelectionForCommandSession,
    resetToSelectCommandSession,
    updateCommandSessionMessage,
} from '../commands/commandReducer';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';
import { SelectionManager } from './SelectionManager';

export class EditorController {
    private readonly selectionManager: SelectionManager;
    private readonly state: EditorState;

    constructor(state: EditorState) {
        this.state = state;
        this.selectionManager = new SelectionManager(state.selection);
    }

    activateCommand(commandId: CommandId): EditorState {
        return {
            ...this.state,
            commandSession: activateCommandSession(
                this.state.commandSession,
                commandId,
                createCommandAvailabilityContext(this.state),
            ),
        };
    }

    applyDocumentEdit(edit: DocumentEdit): EditorState {
        return {
            ...this.state,
            document: editCadDocument(this.state.document, edit),
            draft: null,
        };
    }

    applyNavigation(navigation: ViewNavigationState): EditorState {
        return {
            ...this.state,
            navigation,
        };
    }

    cancelActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: cancelCommandSession(this.state.commandSession),
            draft: null,
        };
    }

    clearSelection(): EditorState {
        return {
            ...this.state,
            selection: this.selectionManager.clear(),
        };
    }

    completeActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: completeCommandSession(this.state.commandSession),
            draft: null,
        };
    }

    preselectTarget(target: SelectionTarget | null): EditorState {
        if (this.state.commandSession.id !== 'select') {
            return {
                ...this.state,
                selection: this.selectionManager.preselect(null),
            };
        }

        return {
            ...this.state,
            selection: this.selectionManager.preselect(target),
        };
    }

    replaceDraft(draft: EditDraft | null): EditorState {
        return {
            ...this.state,
            draft,
        };
    }

    replaceSelection(target: SelectionTarget | null): EditorState {
        if (this.state.commandSession.id !== 'select') {
            return this.state;
        }

        const nextSelection = this.selectionManager.replaceWith(target);
        const nextCommandSession = consumeSelectionForCommandSession(
            this.state.commandSession,
            nextSelection.selection,
        );

        return {
            ...this.state,
            commandSession: nextCommandSession,
            selection: nextSelection,
        };
    }

    resetToSelectCommand(): EditorState {
        return {
            ...this.state,
            commandSession: resetToSelectCommandSession(),
            draft: null,
        };
    }

    updateCommandMessage(message: string): EditorState {
        return {
            ...this.state,
            commandSession: updateCommandSessionMessage(this.state.commandSession, message),
        };
    }
}

function createCommandAvailabilityContext(state: EditorState) {
    return {
        hasSketchProfile: false,
        selectionObjectIds: state.selection.selection.objectIds,
    };
}
