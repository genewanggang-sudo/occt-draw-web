import type { SketchSnapCandidate } from '../types';

export function chooseBestSnap<TSourceRef>(
    candidates: readonly SketchSnapCandidate<TSourceRef>[],
): SketchSnapCandidate<TSourceRef> | null {
    return [...candidates].sort(compareSnapCandidates)[0] ?? null;
}

function compareSnapCandidates<TSourceRef>(
    left: SketchSnapCandidate<TSourceRef>,
    right: SketchSnapCandidate<TSourceRef>,
): number {
    if (left.priority !== right.priority) {
        return right.priority - left.priority;
    }

    if (left.distancePixels !== right.distancePixels) {
        return left.distancePixels - right.distancePixels;
    }

    return left.stableId.localeCompare(right.stableId);
}
