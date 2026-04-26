export type SketchModuleStatus = 'scaffold';

export interface SketchModuleManifest {
    readonly name: '@occt-draw/sketch';
    readonly status: SketchModuleStatus;
    readonly summary: string;
}

export const SKETCH_MODULE_MANIFEST: SketchModuleManifest = {
    name: '@occt-draw/sketch',
    status: 'scaffold',
    summary: '草图平面、草图元素、草图编辑状态和草图工具流的 TypeScript 领域包。',
};

export function getSketchModuleManifest(): SketchModuleManifest {
    return SKETCH_MODULE_MANIFEST;
}
