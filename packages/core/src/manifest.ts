export type CoreDirection = 'three-dimensional-cloud-cad';
export type CoreStatus = 'ready';

export interface CoreModuleManifest {
    readonly direction: CoreDirection;
    readonly name: '@occt-draw/core';
    readonly status: CoreStatus;
    readonly summary: string;
}

export const CORE_MODULE_MANIFEST: CoreModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/core',
    status: 'ready',
    summary: '三维云端 CAD 的文档、工作室、对象、选择和特征领域模型。',
};

export function getCoreModuleManifest(): CoreModuleManifest {
    return CORE_MODULE_MANIFEST;
}
