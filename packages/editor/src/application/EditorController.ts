import {
    editCadDocument,
    type DocumentEdit,
    type EditDraft,
    type SelectionTarget,
} from '@occt-draw/core';
import type { CommandResult } from '../commands/CadCommand';
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

    public activateCommand(commandId: CommandId): EditorState {
        return {
            ...this.state,
            commandSession: activateCommandSession(
                this.state.commandSession,
                commandId,
                createCommandAvailabilityContext(this.state),
            ),
        };
    }

    public applyDocumentEdit(edit: DocumentEdit): EditorState {
        return {
            ...this.state,
            document: editCadDocument(this.state.document, edit),
            draft: null,
        };
    }

    public applyNavigation(navigation: ViewNavigationState): EditorState {
        return {
            ...this.state,
            navigation,
        };
    }

    public applyCommandResult(result: CommandResult): EditorState {
        let nextState = this.state;

        if (result.commandSession) {
            nextState = {
                ...nextState,
                commandSession: result.commandSession,
            };
        }

        if (result.message) {
            nextState = new EditorController(nextState).updateCommandMessage(result.message);
        }

        if (result.selection) {
            nextState = {
                ...nextState,
                selection: result.selection,
            };
        }

        if (result.sketches) {
            nextState = {
                ...nextState,
                sketches: result.sketches,
            };
        }

        if ('activeSketchSession' in result) {
            nextState = {
                ...nextState,
                activeSketchSession: result.activeSketchSession ?? null,
            };
        }

        if (result.navigation) {
            nextState = {
                ...nextState,
                navigation: result.navigation,
            };
        }

        if ('draft' in result) {
            nextState = {
                ...nextState,
                draft: result.draft ?? null,
            };
        }

        if (result.documentEdit) {
            nextState = new EditorController(nextState).applyDocumentEdit(result.documentEdit);
        }

        return nextState;
    }

    public cancelActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: cancelCommandSession(this.state.commandSession),
            draft: null,
            activeSketchSession: shouldExitSketchSession(this.state)
                ? null
                : this.state.activeSketchSession,
        };
    }

    public clearSelection(): EditorState {
        return {
            ...this.state,
            selection: this.selectionManager.clear(),
        };
    }

    public completeActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: completeCommandSession(this.state.commandSession),
            draft: null,
        };
    }

    public preselectTarget(target: SelectionTarget | null): EditorState {
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

    public replaceDraft(draft: EditDraft | null): EditorState {
        return {
            ...this.state,
            draft,
        };
    }

    public replaceSelection(target: SelectionTarget | null): EditorState {
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

    public resetToSelectCommand(): EditorState {
        return {
            ...this.state,
            commandSession: resetToSelectCommandSession(),
            draft: null,
        };
    }

    public updateCommandMessage(message: string): EditorState {
        return {
            ...this.state,
            commandSession: updateCommandSessionMessage(this.state.commandSession, message),
        };
    }
}

function createCommandAvailabilityContext(state: EditorState) {
    const activePartStudio = state.document.getActivePartStudio();
    const selectedReferencePlaneCount = state.selection.selection.objectIds.filter((objectId) => {
        const object = activePartStudio.findObjectById(objectId);

        return object?.kind === 'reference-plane';
    }).length;

    return {
        activeSketchTool: state.activeSketchSession?.activeTool ?? null,
        hasSketchProfile: false,
        isEditingSketch: state.activeSketchSession !== null,
        selectionObjectIds: state.selection.selection.objectIds,
        selectedReferencePlaneCount,
    };
}

function shouldExitSketchSession(state: EditorState): boolean {
    return state.activeSketchSession?.pendingLineStartPointId === null;
}
