export type SceneModuleStatus = 'scaffold';

export interface SceneModuleManifest {
    readonly name: '@occt-draw/scene';
    readonly status: SceneModuleStatus;
    readonly summary: string;
}

export const SCENE_MODULE_MANIFEST: SceneModuleManifest = {
    name: '@occt-draw/scene',
    status: 'scaffold',
    summary: '三维场景图、对象树、选择集、可见性和装配显示状态的领域包。',
};

export function getSceneModuleManifest(): SceneModuleManifest {
    return SCENE_MODULE_MANIFEST;
}
