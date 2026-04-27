export type MathModuleStatus = 'ready';

export interface MathModuleManifest {
    readonly name: '@occt-draw/math';
    readonly status: MathModuleStatus;
    readonly summary: string;
}

export const MATH_MODULE_MANIFEST: MathModuleManifest = {
    name: '@occt-draw/math',
    status: 'ready',
    summary: 'CAD 前端几何基础包，提供点、向量、平面、射线、矩阵、变换和数值容差。',
};

export function getMathModuleManifest(): MathModuleManifest {
    return MATH_MODULE_MANIFEST;
}
