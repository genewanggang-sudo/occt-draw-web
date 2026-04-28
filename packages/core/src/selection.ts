import type { CadObjectId } from './ids';

export type SelectionTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface SelectionTarget {
    readonly objectId: CadObjectId;
    readonly primitiveId: string | null;
    readonly targetKind: SelectionTargetKind;
}

export class SelectionSet {
    public readonly objectIds: readonly CadObjectId[];
    public readonly primaryTarget: SelectionTarget | null;

    constructor(
        objectIds: readonly CadObjectId[] = [],
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
