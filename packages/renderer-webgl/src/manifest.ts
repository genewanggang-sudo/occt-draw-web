export type RendererWebglModuleStatus = 'ready';

export interface RendererWebglModuleManifest {
    readonly name: '@occt-draw/renderer-webgl';
    readonly status: RendererWebglModuleStatus;
    readonly summary: string;
}

export const RENDERER_WEBGL_MODULE_MANIFEST: RendererWebglModuleManifest = {
    name: '@occt-draw/renderer-webgl',
    status: 'ready',
    summary: 'WebGL 三维渲染后端，负责网格、边线、选择高亮和视窗绘制。',
};

export function getRendererWebglModuleManifest(): RendererWebglModuleManifest {
    return RENDERER_WEBGL_MODULE_MANIFEST;
}
