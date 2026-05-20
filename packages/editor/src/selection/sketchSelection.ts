import type { CadRenderPickRef } from '@occt-draw/cad-rendering';
import type { SelectionTarget } from '@occt-draw/core';
import { SketchEntityKind, type SketchEntityRef } from '@occt-draw/sketch';

const CAD_RENDER_PICK_REF_METADATA_KEY = 'pickRef';
const CAD_RENDER_SOURCE = 'cad-render';
const SKETCH_ENTITY_REF_METADATA_KEY = 'sketchEntityRef';
const SKETCH_SOURCE = 'sketch';
const SOURCE_METADATA_KEY = 'source';

export function getSketchEntityRefFromSelectionTarget(
    target: SelectionTarget | null,
): SketchEntityRef | null {
    const metadata = target?.metadata;

    if (!metadata) {
        return null;
    }

    if (metadata.get(SOURCE_METADATA_KEY) === CAD_RENDER_SOURCE) {
        return getSketchEntityRefFromCadRenderPickRef(
            metadata.get(CAD_RENDER_PICK_REF_METADATA_KEY),
        );
    }

    if (metadata.get(SOURCE_METADATA_KEY) !== SKETCH_SOURCE) {
        return null;
    }

    const ref = metadata.get(SKETCH_ENTITY_REF_METADATA_KEY);

    return isSketchEntityRef(ref) ? ref : null;
}

function getSketchEntityRefFromCadRenderPickRef(value: unknown): SketchEntityRef | null {
    if (!isCadRenderPickRef(value) || value.domain !== 'sketch') {
        return null;
    }

    if (value.entityKind === 'edge' && value.entityId) {
        return {
            entityId: value.entityId,
            kind: SketchEntityKind.Edge,
            sketchId: value.objectId,
        };
    }

    if (value.entityKind === 'vertex' && value.entityId) {
        return {
            entityId: value.entityId,
            kind: SketchEntityKind.Vertex,
            sketchId: value.objectId,
        };
    }

    return null;
}

function isCadRenderPickRef(value: unknown): value is CadRenderPickRef {
    if (!isRecord(value)) {
        return false;
    }

    return typeof value.domain === 'string' && typeof value.objectId === 'string';
}

function isSketchEntityRef(value: unknown): value is SketchEntityRef {
    if (!isRecord(value)) {
        return false;
    }

    if (
        typeof value.sketchId !== 'string' ||
        typeof value.kind !== 'string' ||
        typeof value.entityId !== 'string'
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
