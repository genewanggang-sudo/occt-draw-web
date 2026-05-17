import type { SketchSnapCandidate } from '../types';

export function chooseBestSnap(
    candidates: readonly SketchSnapCandidate[],
): SketchSnapCandidate | null {
    return [...candidates].sort(compareSnapCandidates)[0] ?? null;
}

function compareSnapCandidates(left: SketchSnapCandidate, right: SketchSnapCandidate): number {
    if (left.priority !== right.priority) {
        return right.priority - left.priority;
    }

    if (left.distancePixels !== right.distancePixels) {
        return left.distancePixels - right.distancePixels;
    }

    return left.stableId.localeCompare(right.stableId);
}
