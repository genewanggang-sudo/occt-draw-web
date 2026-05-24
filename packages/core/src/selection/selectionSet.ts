import type { ObjectId } from '../ids';

export type SelectionTargetKind = 'edge' | 'face' | 'object' | 'vertex';
export type SelectionObjectId = ObjectId;

export interface SelectionTarget {
    readonly metadata?: ReadonlyMap<string, unknown>;
    readonly objectId: SelectionObjectId;
    readonly primitiveId: string | null;
    readonly targetKind: SelectionTargetKind;
}

export class SelectionSet {
    public readonly objectIds: readonly SelectionObjectId[];
    public readonly primaryTarget: SelectionTarget | null;

    constructor(
        objectIds: readonly SelectionObjectId[] = [],
        primaryTarget: SelectionTarget | null = null,
    ) {
        this.objectIds = [...objectIds];
        this.primaryTarget = primaryTarget;
    }

    public isEmpty(): boolean {
        return this.objectIds.length === 0;
    }
}

export function createEmptySelectionSet(): SelectionSet {
    return new SelectionSet();
}

export function createSelectionSetFromTarget(target: SelectionTarget): SelectionSet {
    return new SelectionSet([target.objectId], target);
}
