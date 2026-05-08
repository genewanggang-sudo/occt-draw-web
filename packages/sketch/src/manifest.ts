import type { SketchModuleManifest } from './types';

export const SKETCH_MODULE_MANIFEST: SketchModuleManifest = {
    domain: 'sketch',
    status: 'active',
} as const;

export function getSketchModuleManifest(): SketchModuleManifest {
    return SKETCH_MODULE_MANIFEST;
}
