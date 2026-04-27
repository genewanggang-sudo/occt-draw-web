export type CadObjectId = string;
export type CadObjectKind = 'debug-cube' | 'reference-axis' | 'reference-grid';
export type CoreDirection = 'three-dimensional-cloud-cad';
export type CoreStatus = 'ready';
export type DocumentId = string;
export type FeatureId = string;
export type FeatureKind = 'placeholder';
export type FeatureStatus = 'ready' | 'suppressed';
export type PartStudioId = string;
export type SelectionTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface CoreModuleManifest {
    readonly direction: CoreDirection;
    readonly name: '@occt-draw/core';
    readonly status: CoreStatus;
    readonly summary: string;
}

export interface Feature {
    readonly id: FeatureId;
    readonly kind: FeatureKind;
    readonly name: string;
    readonly status: FeatureStatus;
    readonly suppressed: boolean;
}

export interface BaseCadObject {
    readonly id: CadObjectId;
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

export interface SelectionTarget {
    readonly objectId: CadObjectId;
    readonly primitiveId: string | null;
    readonly targetKind: SelectionTargetKind;
}

export class SelectionSet {
    readonly objectIds: readonly CadObjectId[];
    readonly primaryTarget: SelectionTarget | null;

    constructor(
        objectIds: readonly CadObjectId[] = [],
        primaryTarget: SelectionTarget | null = null,
    ) {
        this.objectIds = [...objectIds];
        this.primaryTarget = primaryTarget;
    }

    isEmpty(): boolean {
        return this.objectIds.length === 0;
    }
}

export class PartStudio {
    readonly features: readonly Feature[];
    readonly id: PartStudioId;
    readonly name: string;
    readonly objects: readonly CadObject[];

    constructor({
        features,
        id,
        name,
        objects,
    }: {
        readonly features: readonly Feature[];
        readonly id: PartStudioId;
        readonly name: string;
        readonly objects: readonly CadObject[];
    }) {
        this.features = [...features];
        this.id = id;
        this.name = name;
        this.objects = [...objects];
    }

    findObjectById(objectId: CadObjectId): CadObject | null {
        return this.objects.find((object) => object.id === objectId) ?? null;
    }

    listVisibleObjects(): readonly CadObject[] {
        return this.objects.filter((object) => object.visible);
    }
}

export class CadDocument {
    readonly activePartStudioId: PartStudioId;
    readonly id: DocumentId;
    readonly name: string;
    readonly partStudios: readonly PartStudio[];

    constructor({
        activePartStudioId,
        id,
        name,
        partStudios,
    }: {
        readonly activePartStudioId: PartStudioId;
        readonly id: DocumentId;
        readonly name: string;
        readonly partStudios: readonly PartStudio[];
    }) {
        this.activePartStudioId = activePartStudioId;
        this.id = id;
        this.name = name;
        this.partStudios = [...partStudios];
    }

    getActivePartStudio(): PartStudio {
        return (
            this.partStudios.find((partStudio) => partStudio.id === this.activePartStudioId) ??
            this.partStudios[0] ??
            createEmptyPartStudio()
        );
    }
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

export function createEmptySelectionSet(): SelectionSet {
    return new SelectionSet();
}

export function createSelectionSetFromTarget(target: SelectionTarget): SelectionSet {
    return new SelectionSet([target.objectId], target);
}

export function getActivePartStudio(document: CadDocument): PartStudio {
    return document.getActivePartStudio();
}

export function findCadObjectById(partStudio: PartStudio, objectId: CadObjectId): CadObject | null {
    return partStudio.findObjectById(objectId);
}

export function listVisibleCadObjects(partStudio: PartStudio): readonly CadObject[] {
    return partStudio.listVisibleObjects();
}

export function createDefaultCadDocument(): CadDocument {
    const activePartStudio = new PartStudio({
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
    });

    return new CadDocument({
        id: 'document-default',
        name: '未命名文档',
        activePartStudioId: activePartStudio.id,
        partStudios: [activePartStudio],
    });
}

function createEmptyPartStudio(): PartStudio {
    return new PartStudio({
        id: 'part-studio-empty',
        name: '空零件工作室',
        features: [],
        objects: [],
    });
}
