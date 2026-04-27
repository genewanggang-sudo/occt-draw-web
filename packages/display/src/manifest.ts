export type DisplayModuleStatus = 'ready';

export interface DisplayModuleManifest {
    readonly name: '@occt-draw/display';
    readonly status: DisplayModuleStatus;
    readonly summary: string;
}

export const DISPLAY_MODULE_MANIFEST: DisplayModuleManifest = {
    name: '@occt-draw/display',
    status: 'ready',
    summary: '显示模型投影层，负责把 CAD 文档和临时编辑层转换成可渲染数据。',
};

export function getDisplayModuleManifest(): DisplayModuleManifest {
    return DISPLAY_MODULE_MANIFEST;
}
