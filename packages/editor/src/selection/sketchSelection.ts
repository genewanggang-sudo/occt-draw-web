import type { SelectionTarget } from '@occt-draw/core';
import type { SketchEntityKind, SketchEntityRef } from '@occt-draw/sketch';

const SKETCH_ENTITY_REF_METADATA_KEY = 'sketchEntityRef';

export function getSketchEntityRefFromSelectionTarget(
    target: SelectionTarget | null,
): SketchEntityRef | null {
    const ref = target?.metadata?.get(SKETCH_ENTITY_REF_METADATA_KEY);

    return isSketchEntityRef(ref) ? ref : null;
}

function isSketchEntityRef(value: unknown): value is SketchEntityRef {
    if (!isRecord(value)) {
        return false;
    }

    if (
        typeof value.sketchId !== 'string' ||
        typeof value.kind !== 'string' ||
        typeof value.id !== 'string'
    ) {
        return false;
    }

    return isSketchEntityKind(value.kind);
}

function isSketchEntityKind(value: string): value is SketchEntityKind {
    switch (value) {
        case 'constraint':
        case 'curve':
        case 'dimension':
        case 'edge':
        case 'point':
        case 'profile':
        case 'sketch-state':
        case 'vertex':
            return true;
    }

    return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}
