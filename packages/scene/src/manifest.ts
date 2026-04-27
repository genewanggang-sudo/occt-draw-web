export type SceneModuleStatus = 'ready';

export interface SceneModuleManifest {
    readonly name: '@occt-draw/scene';
    readonly status: SceneModuleStatus;
    readonly summary: string;
}

export const SCENE_MODULE_MANIFEST: SceneModuleManifest = {
    name: '@occt-draw/scene',
    status: 'ready',
    summary: '三维场景投影层，负责把 CAD 文档对象转换成渲染场景表达。',
};

export function getSceneModuleManifest(): SceneModuleManifest {
    return SCENE_MODULE_MANIFEST;
}
