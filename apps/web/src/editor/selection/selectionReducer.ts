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

export function preselectObject(
    selection: SelectionState,
    objectId: string | null,
): SelectionState {
    const nextPreselectedObjectId = selection.selectedObjectIds.includes(objectId ?? '')
        ? null
        : objectId;

    if (
        selection.hoveredObjectId === nextPreselectedObjectId &&
        selection.preselectedObjectId === nextPreselectedObjectId
    ) {
        return selection;
    }

    return {
        ...selection,
        hoveredObjectId: nextPreselectedObjectId,
        preselectedObjectId: nextPreselectedObjectId,
    };
}
