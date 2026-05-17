import { Vec2 } from '@occt-draw/math';
import type { SketchEntityRef } from '@occt-draw/sketch';
import { projectWorldToScreen } from '@occt-draw/webgl-engine';
import type { SketchSnapCandidate, SketchSnapInput } from '../types';

const VERTEX_SNAP_PRIORITY = 1000;

export function collectVertexSnapCandidates(
    input: SketchSnapInput,
): readonly SketchSnapCandidate[] {
    if (!input.enabledKinds.includes('vertex')) {
        return [];
    }

    const candidates: SketchSnapCandidate[] = [];

    for (const vertex of input.sketch.entities.topology.vertices.list()) {
        if (isExcluded(input, vertex.ref)) {
            continue;
        }

        const point = input.sketch.findPointForVertex(vertex.id);

        if (!point) {
            continue;
        }

        const worldPoint = input.plane.localToWorld(point.position);
        const screenPoint = projectWorldToScreen(worldPoint, input.camera, input.viewportSize);
        const distancePixels = Vec2.distance(screenPoint, input.pointerPoint);

        if (distancePixels > input.thresholdPixels) {
            continue;
        }

        candidates.push({
            distancePixels,
            kind: 'vertex',
            point: point.position,
            priority: VERTEX_SNAP_PRIORITY,
            sourceRef: vertex.ref,
            stableId: vertex.id,
            worldPoint,
        });
    }

    return candidates;
}

function isExcluded(input: SketchSnapInput, ref: SketchEntityRef): boolean {
    if (ref.kind !== 'vertex') {
        return false;
    }

    return (
        input.excludedRefs?.some(
            (excluded) =>
                excluded.kind === 'vertex' &&
                excluded.sketchId === ref.sketchId &&
                excluded.vertexId === ref.vertexId,
        ) ?? false
    );
}
