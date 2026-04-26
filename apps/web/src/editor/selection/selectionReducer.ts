import type { PickSceneObjectResult } from '@occt-draw/renderer';
import type { SelectionState } from './selectionState';

export function clearSelection(selection: SelectionState): SelectionState {
    if (
        selection.selectedObjectIds.length === 0 &&
        selection.selectedTarget === null &&
        selection.hoveredObjectId === null &&
        selection.preselectedObjectId === null &&
        selection.preselectedTarget === null
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        preselectedTarget: null,
        selectedObjectIds: [],
        selectedTarget: null,
    };
}

export function selectSingleTarget(
    selection: SelectionState,
    target: PickSceneObjectResult,
): SelectionState {
    if (
        selection.selectedObjectIds.length === 1 &&
        selection.selectedObjectIds[0] === target.objectId &&
        isSameTarget(selection.selectedTarget, target) &&
        selection.hoveredObjectId === null &&
        selection.preselectedObjectId === null &&
        selection.preselectedTarget === null
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedObjectId: null,
        preselectedTarget: null,
        selectedObjectIds: [target.objectId],
        selectedTarget: target,
    };
}

export function preselectTarget(
    selection: SelectionState,
    target: PickSceneObjectResult | null,
): SelectionState {
    const nextTarget =
        target && selection.selectedObjectIds.includes(target.objectId) ? null : target;
    const nextObjectId = nextTarget?.objectId ?? null;

    if (
        selection.hoveredObjectId === nextObjectId &&
        selection.preselectedObjectId === nextObjectId &&
        isSameTarget(selection.preselectedTarget, nextTarget)
    ) {
        return selection;
    }

    return {
        ...selection,
        hoveredObjectId: nextObjectId,
        preselectedObjectId: nextObjectId,
        preselectedTarget: nextTarget,
    };
}

function isSameTarget(
    left: PickSceneObjectResult | null,
    right: PickSceneObjectResult | null,
): boolean {
    if (left === null || right === null) {
        return left === right;
    }

    return (
        left.objectId === right.objectId &&
        left.targetKind === right.targetKind &&
        left.primitiveId === right.primitiveId
    );
}
