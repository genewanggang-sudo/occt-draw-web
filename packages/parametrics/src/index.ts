export type ParametricsModuleStatus = 'scaffold';

export interface ParametricsModuleManifest {
    readonly name: '@occt-draw/parametrics';
    readonly status: ParametricsModuleStatus;
    readonly summary: string;
}

export const PARAMETRICS_MODULE_MANIFEST: ParametricsModuleManifest = {
    name: '@occt-draw/parametrics',
    status: 'scaffold',
    summary: '参数、表达式、变量表和特征驱动关系的 TypeScript 领域包。',
};

export function getParametricsModuleManifest(): ParametricsModuleManifest {
    return PARAMETRICS_MODULE_MANIFEST;
}
