export type SketchSnappingModuleStatus = 'active';

export interface SketchSnappingModuleManifest {
    readonly domain: 'sketch-snapping';
    readonly status: SketchSnappingModuleStatus;
}

export const SKETCH_SNAPPING_MODULE_MANIFEST = {
    domain: 'sketch-snapping',
    status: 'active',
} satisfies SketchSnappingModuleManifest;

export function getSketchSnappingModuleManifest(): SketchSnappingModuleManifest {
    return SKETCH_SNAPPING_MODULE_MANIFEST;
}
