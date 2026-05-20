import {
    createEmptySelectionSet,
    createSelectionSetFromTarget,
    type SelectionTarget,
} from '@occt-draw/core';
import type { SelectionState } from './selectionState';

export function clearSelection(selection: SelectionState): SelectionState {
    if (
        selection.hoveredObjectId === null &&
        selection.preselectedTarget === null &&
        selection.selection.isEmpty()
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedTarget: null,
        selection: createEmptySelectionSet(),
    };
}

export function replaceSelection(
    selection: SelectionState,
    target: SelectionTarget | null,
): SelectionState {
    if (target === null) {
        return clearSelection(selection);
    }

    if (
        selection.selection.objectIds.length === 1 &&
        selection.selection.objectIds[0] === target.objectId &&
        isSameTarget(selection.selection.primaryTarget, target) &&
        selection.hoveredObjectId === null &&
        selection.preselectedTarget === null
    ) {
        return selection;
    }

    return {
        hoveredObjectId: null,
        preselectedTarget: null,
        selection: createSelectionSetFromTarget(target),
    };
}

export function updatePreselection(
    selection: SelectionState,
    target: SelectionTarget | null,
): SelectionState {
    const nextTarget =
        target && selection.selection.objectIds.includes(target.objectId) ? null : target;
    const nextHoveredObjectId = nextTarget?.objectId ?? null;

    if (
        selection.hoveredObjectId === nextHoveredObjectId &&
        isSameTarget(selection.preselectedTarget, nextTarget)
    ) {
        return selection;
    }

    return {
        ...selection,
        hoveredObjectId: nextHoveredObjectId,
        preselectedTarget: nextTarget,
    };
}

function isSameTarget(left: SelectionTarget | null, right: SelectionTarget | null): boolean {
    if (left === null || right === null) {
        return left === right;
    }

    return (
        left.objectId === right.objectId &&
        left.targetKind === right.targetKind &&
        left.primitiveId === right.primitiveId
    );
}
