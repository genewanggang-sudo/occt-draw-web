export interface SelectionState {
    readonly hoveredObjectId: string | null;
    readonly preselectedObjectId: string | null;
    readonly selectedObjectIds: readonly string[];
}

export function createInitialSelectionState(): SelectionState {
    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        selectedObjectIds: [],
    };
}
