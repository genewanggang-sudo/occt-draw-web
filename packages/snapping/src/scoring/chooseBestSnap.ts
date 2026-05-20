import type { SnapCandidate } from '../types';

export function chooseBestSnap<TSourceRef>(
    candidates: readonly SnapCandidate<TSourceRef>[],
): SnapCandidate<TSourceRef> | null {
    return [...candidates].sort(compareSnapCandidates)[0] ?? null;
}

function compareSnapCandidates<TSourceRef>(
    left: SnapCandidate<TSourceRef>,
    right: SnapCandidate<TSourceRef>,
): number {
    if (left.priority !== right.priority) {
        return right.priority - left.priority;
    }

    if (left.distancePixels !== right.distancePixels) {
        return left.distancePixels - right.distancePixels;
    }

    return left.stableId.localeCompare(right.stableId);
}
