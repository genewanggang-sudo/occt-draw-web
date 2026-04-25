export type CoreDirection = 'three-dimensional-cloud-cad';
export type CoreStatus = 'scaffold';

export interface CoreModuleManifest {
    readonly direction: CoreDirection;
    readonly name: '@occt-draw/core';
    readonly status: CoreStatus;
    readonly summary: string;
}

export const CORE_MODULE_MANIFEST: CoreModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/core',
    status: 'scaffold',
    summary: '二维出图的临时实体与文档实现已删除，等待三维云端 CAD 核心架构重建。',
};

export function getCoreModuleManifest(): CoreModuleManifest {
    return CORE_MODULE_MANIFEST;
}
