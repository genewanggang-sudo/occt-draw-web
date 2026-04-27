import type { SelectionTarget } from '@occt-draw/core';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';
import { CommandManager } from './CommandManager';
import { SelectionManager } from './SelectionManager';

export class EditorController {
    readonly #commandManager: CommandManager;
    readonly #selectionManager: SelectionManager;
    readonly #state: EditorState;

    constructor(state: EditorState) {
        this.#state = state;
        this.#commandManager = new CommandManager(state.commandSession);
        this.#selectionManager = new SelectionManager(state.selection);
    }

    activateCommand(commandId: CommandId): EditorState {
        return {
            ...this.#state,
            commandSession: this.#commandManager.activate(
                commandId,
                createCommandAvailabilityContext(this.#state),
            ),
        };
    }

    applyNavigation(navigation: ViewNavigationState): EditorState {
        return {
            ...this.#state,
            navigation,
        };
    }

    cancelActiveCommand(): EditorState {
        return {
            ...this.#state,
            commandSession: this.#commandManager.cancel(),
        };
    }

    clearSelection(): EditorState {
        return {
            ...this.#state,
            selection: this.#selectionManager.clear(),
        };
    }

    completeActiveCommand(): EditorState {
        return {
            ...this.#state,
            commandSession: this.#commandManager.complete(),
        };
    }

    preselectTarget(target: SelectionTarget | null): EditorState {
        if (this.#state.commandSession.id !== 'select') {
            return {
                ...this.#state,
                selection: this.#selectionManager.preselect(null),
            };
        }

        return {
            ...this.#state,
            selection: this.#selectionManager.preselect(target),
        };
    }

    replaceSelection(target: SelectionTarget | null): EditorState {
        if (this.#state.commandSession.id !== 'select') {
            return this.#state;
        }

        const nextSelection = this.#selectionManager.replaceWith(target);
        const nextCommandSession = this.#commandManager.consumeSelection(nextSelection.selection);

        return {
            ...this.#state,
            commandSession: nextCommandSession,
            selection: nextSelection,
        };
    }

    resetToSelectCommand(): EditorState {
        return {
            ...this.#state,
            commandSession: this.#commandManager.resetToSelect(),
        };
    }
}

function createCommandAvailabilityContext(state: EditorState) {
    return {
        hasSketchProfile: false,
        selectionObjectIds: state.selection.selection.objectIds,
    };
}
