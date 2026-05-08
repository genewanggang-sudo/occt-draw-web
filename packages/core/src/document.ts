import type { Feature } from './features';
import type { CadObjectId, DocumentId, FeatureId, PartStudioId } from './ids';
import type { CadObject } from './objects';

export type FeaturePayload = object;
export type FeaturePayloadId = string;

export class FeaturePayloadStore {
    private readonly payloads: Readonly<Record<FeaturePayloadId, FeaturePayload>>;

    constructor(payloads: Readonly<Record<FeaturePayloadId, FeaturePayload>> = {}) {
        this.payloads = { ...payloads };
    }

    public find(payloadId: FeaturePayloadId): FeaturePayload | null {
        const payload = this.payloads[payloadId];

        return payload ?? null;
    }

    public set(payloadId: FeaturePayloadId, payload: FeaturePayload): FeaturePayloadStore {
        return new FeaturePayloadStore({
            ...this.payloads,
            [payloadId]: payload,
        });
    }
}

export class PartStudio {
    public readonly featurePayloads: FeaturePayloadStore;
    public readonly features: readonly Feature[];
    public readonly id: PartStudioId;
    public readonly name: string;
    public readonly objects: readonly CadObject[];

    constructor({
        features,
        featurePayloads,
        id,
        name,
        objects,
    }: {
        readonly featurePayloads?: FeaturePayloadStore;
        readonly features: readonly Feature[];
        readonly id: PartStudioId;
        readonly name: string;
        readonly objects: readonly CadObject[];
    }) {
        this.featurePayloads = featurePayloads ?? new FeaturePayloadStore();
        this.features = [...features];
        this.id = id;
        this.name = name;
        this.objects = [...objects];
    }

    public findObjectById(objectId: CadObjectId): CadObject | null {
        return this.objects.find((object) => object.id === objectId) ?? null;
    }

    public findFeatureById(featureId: FeatureId): Feature | null {
        return this.features.find((feature) => feature.id === featureId) ?? null;
    }

    public findFeaturePayload(payloadId: FeaturePayloadId): FeaturePayload | null {
        return this.featurePayloads.find(payloadId);
    }

    public listFeatures(): readonly Feature[] {
        return this.features;
    }

    public listVisibleObjects(): readonly CadObject[] {
        return this.objects.filter((object) => object.visible);
    }

    public appendFeature(feature: Feature): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            name: this.name,
            features: [...this.features, feature],
            objects: this.objects,
        });
    }

    public replaceFeature(feature: Feature): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            name: this.name,
            features: this.features.map((current) =>
                current.id === feature.id ? feature : current,
            ),
            objects: this.objects,
        });
    }

    public removeFeature(featureId: FeatureId): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            name: this.name,
            features: this.features.filter((feature) => feature.id !== featureId),
            objects: this.objects,
        });
    }

    public setFeaturePayload(payloadId: FeaturePayloadId, payload: FeaturePayload): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads.set(payloadId, payload),
            features: this.features,
            id: this.id,
            name: this.name,
            objects: this.objects,
        });
    }
}

export class CadDocument {
    public readonly activePartStudioId: PartStudioId;
    public readonly id: DocumentId;
    public readonly name: string;
    public readonly partStudios: readonly PartStudio[];

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

    public getActivePartStudio(): PartStudio {
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
