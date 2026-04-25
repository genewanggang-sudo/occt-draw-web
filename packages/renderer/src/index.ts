export type RendererDirection = 'three-dimensional-cloud-cad';
export type RendererStatus = 'scaffold';

export interface RendererModuleManifest {
    readonly direction: RendererDirection;
    readonly name: '@occt-draw/renderer';
    readonly status: RendererStatus;
    readonly summary: string;
}

export const RENDERER_MODULE_MANIFEST: RendererModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/renderer',
    status: 'scaffold',
    summary: '二维 Canvas 渲染器与命中测试实现已删除，等待三维渲染架构重新设计。',
};

export function getRendererModuleManifest(): RendererModuleManifest {
    return RENDERER_MODULE_MANIFEST;
}
