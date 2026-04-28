import type { SelectionTarget } from '@occt-draw/core';
import {
    clearSelection,
    replaceSelection,
    updatePreselection,
} from '../selection/selectionReducer';
import type { SelectionState } from '../selection/selectionState';

export class SelectionManager {
    private readonly state: SelectionState;

    constructor(state: SelectionState) {
        this.state = state;
    }

    public clear(): SelectionState {
        return clearSelection(this.state);
    }

    public getSelection(): SelectionState {
        return this.state;
    }

    public preselect(target: SelectionTarget | null): SelectionState {
        return updatePreselection(this.state, target);
    }

    public replaceWith(target: SelectionTarget | null): SelectionState {
        return replaceSelection(this.state, target);
    }
}
