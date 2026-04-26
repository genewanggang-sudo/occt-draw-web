import type { PickSceneObjectResult } from '@occt-draw/renderer';

export interface SelectionState {
    readonly hoveredObjectId: string | null;
    readonly preselectedObjectId: string | null;
    readonly preselectedTarget: PickSceneObjectResult | null;
    readonly selectedObjectIds: readonly string[];
    readonly selectedTarget: PickSceneObjectResult | null;
}

export function createInitialSelectionState(): SelectionState {
    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        preselectedTarget: null,
        selectedObjectIds: [],
        selectedTarget: null,
    };
}
