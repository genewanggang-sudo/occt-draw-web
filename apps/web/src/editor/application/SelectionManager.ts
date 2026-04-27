import type { SelectionTarget } from '@occt-draw/core';
import {
    clearSelection,
    replaceSelection,
    updatePreselection,
} from '../selection/selectionReducer';
import type { SelectionState } from '../selection/selectionState';

export class SelectionManager {
    readonly #state: SelectionState;

    constructor(state: SelectionState) {
        this.#state = state;
    }

    clear(): SelectionState {
        return clearSelection(this.#state);
    }

    getSelection(): SelectionState {
        return this.#state;
    }

    preselect(target: SelectionTarget | null): SelectionState {
        return updatePreselection(this.#state, target);
    }

    replaceWith(target: SelectionTarget | null): SelectionState {
        return replaceSelection(this.#state, target);
    }
}
