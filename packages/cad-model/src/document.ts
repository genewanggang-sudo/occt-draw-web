import {
    BaseDocumentModel,
    BaseModelEntity,
    PayloadStore,
    type DocumentId,
    type Payload,
} from '@occt-draw/core';
import type { Feature } from './features';
import type { CadObjectId, FeaturePayloadId, PartStudioId } from './ids';
import type { CadObject } from './objects';

export type FeaturePayload = Payload;

export class FeaturePayloadStore extends PayloadStore {
    public remove(payloadId: FeaturePayloadId): FeaturePayloadStore {
        return new FeaturePayloadStore(
            this.entries().filter(([currentPayloadId]) => currentPayloadId !== payloadId),
        );
    }

    public override set(payloadId: FeaturePayloadId, payload: FeaturePayload): FeaturePayloadStore {
        return new FeaturePayloadStore([...this.entries(), [payloadId, payload]]);
    }
}

export class PartStudio extends BaseModelEntity {
    public readonly featurePayloads: FeaturePayloadStore;
    public readonly features: readonly Feature[];
    public readonly objects: readonly CadObject[];

    constructor({
        features,
        featurePayloads,
        id,
        metadata,
        name,
        objects,
    }: {
        readonly featurePayloads?: FeaturePayloadStore;
        readonly features: readonly Feature[];
        readonly id: PartStudioId;
        readonly metadata?: ReadonlyMap<string, unknown> | null;
        readonly name: string;
        readonly objects: readonly CadObject[];
    }) {
        super({
            id,
            metadata: metadata ?? null,
            name,
        });
        this.featurePayloads = featurePayloads ?? new FeaturePayloadStore();
        this.features = [...features];
        this.objects = [...objects];
    }

    public findObjectById(objectId: CadObjectId): CadObject | null {
        return this.objects.find((object) => object.id === objectId) ?? null;
    }

    public findFeatureById(featureId: string): Feature | null {
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
            metadata: this.metadata,
            name: this.name,
            features: [...this.features, feature],
            objects: this.objects,
        });
    }

    public replaceFeature(feature: Feature): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            features: this.features.map((current) =>
                current.id === feature.id ? feature : current,
            ),
            objects: this.objects,
        });
    }

    public removeFeature(featureId: string): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            metadata: this.metadata,
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
            metadata: this.metadata,
            name: this.name,
            objects: this.objects,
        });
    }

    public removeFeaturePayload(payloadId: FeaturePayloadId): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads.remove(payloadId),
            features: this.features,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            objects: this.objects,
        });
    }
}

export class CadDocument extends BaseDocumentModel {
    public readonly activePartStudioId: PartStudioId;
    public readonly partStudios: readonly PartStudio[];

    constructor({
        activePartStudioId,
        id,
        metadata,
        name,
        partStudios,
        revision,
    }: {
        readonly activePartStudioId: PartStudioId;
        readonly id: DocumentId;
        readonly metadata?: ReadonlyMap<string, unknown> | null;
        readonly name: string;
        readonly partStudios: readonly PartStudio[];
        readonly revision?: number;
    }) {
        super({
            id,
            metadata: metadata ?? null,
            name,
            revision: revision ?? 0,
        });
        this.activePartStudioId = activePartStudioId;
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
        name: 'Empty Part Studio',
        features: [],
        objects: [],
    });
}
