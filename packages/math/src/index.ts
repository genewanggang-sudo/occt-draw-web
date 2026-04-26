export type MathModuleStatus = 'scaffold';

export interface MathModuleManifest {
    readonly name: '@occt-draw/math';
    readonly status: MathModuleStatus;
    readonly summary: string;
}

export const MATH_MODULE_MANIFEST: MathModuleManifest = {
    name: '@occt-draw/math',
    status: 'scaffold',
    summary: '三维向量、矩阵、射线、平面、包围盒和 CAD 数值容差的基础数学包。',
};

export function getMathModuleManifest(): MathModuleManifest {
    return MATH_MODULE_MANIFEST;
}
