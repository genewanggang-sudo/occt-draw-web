import type { Feature } from './features';
import type { CadObjectId, DocumentId, PartStudioId } from './ids';
import type { CadObject } from './objects';

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

function createEmptyPartStudio(): PartStudio {
    return new PartStudio({
        id: 'part-studio-empty',
        name: '空零件工作室',
        features: [],
        objects: [],
    });
}
