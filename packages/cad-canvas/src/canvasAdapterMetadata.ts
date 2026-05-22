import type { CanvasPickRef, CanvasPrimitiveMetadata } from '@occt-draw/canvas';

export const CAD_CANVAS_METADATA_SOURCE = 'cad-canvas-adapter';
export const CANVAS_PICK_REF_METADATA_KEY = 'canvasPickRef';
export const DOMAIN_METADATA_KEY = 'domain';
export const ENTITY_KIND_METADATA_KEY = 'entityKind';
export const FEATURE_ID_METADATA_KEY = 'featureId';
export const SKETCH_ENTITY_REF_METADATA_KEY = 'sketchEntityRef';
export const SOURCE_METADATA_KEY = 'source';

export function createCanvasPrimitiveMetadata(pickRef: CanvasPickRef): CanvasPrimitiveMetadata {
    return new Map<string, unknown>([
        [SOURCE_METADATA_KEY, CAD_CANVAS_METADATA_SOURCE],
        [CANVAS_PICK_REF_METADATA_KEY, pickRef],
        ...(pickRef.metadata ? pickRef.metadata.entries() : []),
    ]);
}
