export type RendererDirection = 'three-dimensional-cloud-cad';
export type RendererStatus = 'ready';

export interface RendererModuleManifest {
    readonly direction: RendererDirection;
    readonly name: '@occt-draw/renderer';
    readonly status: RendererStatus;
    readonly summary: string;
}

export const RENDERER_MODULE_MANIFEST: RendererModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/renderer',
    status: 'ready',
    summary: '三维渲染抽象接口，负责隔离工作台与具体 WebGL 后端。',
};

export function getRendererModuleManifest(): RendererModuleManifest {
    return RENDERER_MODULE_MANIFEST;
}
