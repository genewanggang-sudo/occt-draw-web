import { createEmptySelectionSet, type SelectionSet, type SelectionTarget } from '@occt-draw/core';

export interface SelectionState {
    readonly hoveredObjectId: string | null;
    readonly preselectedTarget: SelectionTarget | null;
    readonly selection: SelectionSet;
}

export function createInitialSelectionState(): SelectionState {
    return {
        hoveredObjectId: null,
        preselectedTarget: null,
        selection: createEmptySelectionSet(),
    };
}
