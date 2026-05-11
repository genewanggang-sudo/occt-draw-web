import type { SelectionTarget } from '@occt-draw/core';
import type { SketchEntityRef } from '@occt-draw/sketch';

const SKETCH_ENTITY_REF_METADATA_KEY = 'sketchEntityRef';
const SOURCE_METADATA_KEY = 'source';

export function getSketchEntityRefFromSelectionTarget(
    target: SelectionTarget | null,
): SketchEntityRef | null {
    const metadata = target?.metadata;

    if (metadata?.get(SOURCE_METADATA_KEY) !== 'sketch') {
        return null;
    }

    const ref = metadata.get(SKETCH_ENTITY_REF_METADATA_KEY);

    return isSketchEntityRef(ref) ? ref : null;
}

function isSketchEntityRef(value: unknown): value is SketchEntityRef {
    if (!isRecord(value)) {
        return false;
    }

    if (typeof value.sketchId !== 'string' || typeof value.kind !== 'string') {
        return false;
    }

    if (value.kind === 'edge') {
        return typeof value.edgeId === 'string';
    }

    if (value.kind === 'vertex') {
        return typeof value.vertexId === 'string';
    }

    if (value.kind === 'point') {
        return typeof value.pointId === 'string';
    }

    if (value.kind === 'curve') {
        return typeof value.curveId === 'string';
    }

    if (value.kind === 'constraint') {
        return typeof value.constraintId === 'string';
    }

    if (value.kind === 'dimension') {
        return typeof value.dimensionId === 'string';
    }

    if (value.kind === 'profile') {
        return typeof value.profileId === 'string';
    }

    return value.kind === 'sketch-state';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
