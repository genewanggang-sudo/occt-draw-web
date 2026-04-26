import type { SelectionState } from './selectionState';

export function clearSelection(selection: SelectionState): SelectionState {
    if (
        selection.selectedObjectIds.length === 0 &&
        selection.hoveredObjectId === null &&
        selection.preselectedObjectId === null
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        selectedObjectIds: [],
    };
}

export function selectSingleObject(selection: SelectionState, objectId: string): SelectionState {
    if (
        selection.selectedObjectIds.length === 1 &&
        selection.selectedObjectIds[0] === objectId &&
        selection.hoveredObjectId === null &&
        selection.preselectedObjectId === null
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        selectedObjectIds: [objectId],
    };
}
