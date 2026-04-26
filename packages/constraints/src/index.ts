export type ConstraintsModuleStatus = 'scaffold';

export interface ConstraintsModuleManifest {
    readonly name: '@occt-draw/constraints';
    readonly status: ConstraintsModuleStatus;
    readonly summary: string;
}

export const CONSTRAINTS_MODULE_MANIFEST: ConstraintsModuleManifest = {
    name: '@occt-draw/constraints',
    status: 'scaffold',
    summary: '草图几何约束、尺寸约束和约束管理流程的 TypeScript 领域包。',
};

export function getConstraintsModuleManifest(): ConstraintsModuleManifest {
    return CONSTRAINTS_MODULE_MANIFEST;
}
