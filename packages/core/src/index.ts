export type CadObjectKind = 'debug-cube' | 'reference-axis' | 'reference-grid';
export type CoreDirection = 'three-dimensional-cloud-cad';
export type CoreStatus = 'ready';
export type DocumentId = string;
export type FeatureId = string;
export type PartStudioId = string;

export interface CoreModuleManifest {
    readonly direction: CoreDirection;
    readonly name: '@occt-draw/core';
    readonly status: CoreStatus;
    readonly summary: string;
}

export interface CadDocument {
    readonly activePartStudioId: PartStudioId;
    readonly id: DocumentId;
    readonly name: string;
    readonly partStudios: readonly PartStudio[];
}

export interface PartStudio {
    readonly features: readonly Feature[];
    readonly id: PartStudioId;
    readonly name: string;
    readonly objects: readonly CadObject[];
}

export interface Feature {
    readonly id: FeatureId;
    readonly kind: 'placeholder';
    readonly name: string;
}

export interface BaseCadObject {
    readonly id: string;
    readonly kind: CadObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface ReferenceGridObject extends BaseCadObject {
    readonly divisions: number;
    readonly kind: 'reference-grid';
    readonly size: number;
}

export interface ReferenceAxisObject extends BaseCadObject {
    readonly kind: 'reference-axis';
    readonly length: number;
}

export interface DebugCubeObject extends BaseCadObject {
    readonly center: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
    readonly kind: 'debug-cube';
    readonly size: number;
}

export type CadObject = DebugCubeObject | ReferenceAxisObject | ReferenceGridObject;

export const CORE_MODULE_MANIFEST: CoreModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/core',
    status: 'ready',
    summary: '三维云端 CAD 的文档、工作室、对象和特征领域模型。',
};

export function getCoreModuleManifest(): CoreModuleManifest {
    return CORE_MODULE_MANIFEST;
}

export function createDefaultCadDocument(): CadDocument {
    const activePartStudio: PartStudio = {
        id: 'part-studio-default',
        name: '零件工作室 1',
        features: [],
        objects: [
            {
                id: 'grid-main',
                kind: 'reference-grid',
                name: '基准网格',
                visible: true,
                divisions: 20,
                size: 10,
            },
            {
                id: 'axis-main',
                kind: 'reference-axis',
                name: '坐标轴',
                visible: true,
                length: 4,
            },
            {
                id: 'cube-main',
                kind: 'debug-cube',
                name: '调试立方体',
                visible: true,
                center: { x: 0, y: 0.8, z: 0 },
                size: 1.6,
            },
        ],
    };

    return {
        id: 'document-default',
        name: '未命名文档',
        activePartStudioId: activePartStudio.id,
        partStudios: [activePartStudio],
    };
}

export function getActivePartStudio(document: CadDocument): PartStudio {
    return (
        document.partStudios.find((partStudio) => partStudio.id === document.activePartStudioId) ??
        document.partStudios[0] ?? {
            id: 'part-studio-empty',
            name: '空零件工作室',
            features: [],
            objects: [],
        }
    );
}
