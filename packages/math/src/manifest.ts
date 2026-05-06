export type MathModuleStatus = 'ready';

export interface MathModuleManifest {
    readonly name: '@occt-draw/math';
    readonly status: MathModuleStatus;
    readonly summary: string;
}

export const MATH_MODULE_MANIFEST: MathModuleManifest = {
    name: '@occt-draw/math',
    status: 'ready',
    summary:
        'CAD frontend geometry foundation for vectors, planes, rays, matrices, transforms, and numeric tolerance.',
};

export function getMathModuleManifest(): MathModuleManifest {
    return MATH_MODULE_MANIFEST;
}
