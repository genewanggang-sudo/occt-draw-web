import { Vec2 } from '@occt-draw/math';
import type { SketchSnapCandidate, SketchSnapInput } from '../types';

const DEFAULT_VERTEX_SNAP_PRIORITY = 1000;

export function collectVertexSnapCandidates<TSourceRef>(
    input: SketchSnapInput<TSourceRef>,
): readonly SketchSnapCandidate<TSourceRef>[] {
    if (!input.enabledKinds.includes('vertex')) {
        return [];
    }

    const candidates: SketchSnapCandidate<TSourceRef>[] = [];

    for (const source of input.candidates) {
        if (source.kind !== 'vertex') {
            continue;
        }

        const distancePixels = Vec2.distance(source.screenPoint, input.pointerPoint);

        if (distancePixels > input.thresholdPixels) {
            continue;
        }

        candidates.push({
            distancePixels,
            kind: source.kind,
            point: source.point,
            priority: source.priority ?? DEFAULT_VERTEX_SNAP_PRIORITY,
            ...(source.sourceRef ? { sourceRef: source.sourceRef } : {}),
            stableId: source.stableId,
            worldPoint: source.worldPoint,
        });
    }

    return candidates;
}
