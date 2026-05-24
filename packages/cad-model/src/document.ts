import {
    DocumentModel,
    BaseModelElement,
    ModelElementStore,
    ModelRefIndex,
    PayloadStore,
    getNextModelRevision,
    type DocumentId,
    type ModelElement,
    type ModelPropertyValue,
    type ModelRef,
    type Payload,
} from '@occt-draw/core';
import type { Feature } from './features';
import type { CadObjectId, FeatureId, FeaturePayloadId, PartStudioId } from './ids';
import type { CadObject } from './objects';

export type FeaturePayload = Payload;

export class FeaturePayloadStore extends PayloadStore {
    public override remove(payloadId: FeaturePayloadId): FeaturePayloadStore {
        return new FeaturePayloadStore(
            this.entries().filter(([currentPayloadId]) => currentPayloadId !== payloadId),
        );
    }

    public override set(payloadId: FeaturePayloadId, payload: FeaturePayload): FeaturePayloadStore {
        return new FeaturePayloadStore([...this.entries(), [payloadId, payload]]);
    }
}

export class PartStudio extends BaseModelElement {
    public readonly featureStore: ModelElementStore<Feature>;
    public readonly featurePayloads: FeaturePayloadStore;
    public readonly features: readonly Feature[];
    public readonly objectStore: ModelElementStore<CadObject>;
    public readonly objects: readonly CadObject[];

    constructor({
        features,
        featurePayloads,
        id,
        metadata,
        name,
        objects,
        revision,
    }: {
        readonly featurePayloads?: FeaturePayloadStore;
        readonly features: readonly Feature[];
        readonly id: PartStudioId;
        readonly metadata?: ReadonlyMap<string, unknown> | null;
        readonly name: string;
        readonly objects: readonly CadObject[];
        readonly revision?: number;
    }) {
        const featureStore = ModelElementStore.fromEntities(features);
        const objectStore = ModelElementStore.fromEntities(objects);

        super({
            id,
            metadata: metadata ?? null,
            modelType: 'cad.part-studio',
            name,
            properties: new Map<string, ModelPropertyValue>([
                ['featureCount', features.length],
                ['objectCount', objects.length],
            ]),
            ...(revision === undefined ? {} : { revision }),
        });
        this.featureStore = featureStore;
        this.featurePayloads = featurePayloads ?? new FeaturePayloadStore();
        this.features = featureStore.list();
        this.objectStore = objectStore;
        this.objects = objectStore.list();
    }

    public findObjectById(objectId: CadObjectId): CadObject | null {
        return this.objectStore.find(objectId);
    }

    public findFeatureById(featureId: FeatureId): Feature | null {
        return this.featureStore.find(featureId);
    }

    public findFeaturePayload(payloadId: FeaturePayloadId): FeaturePayload | null {
        return this.featurePayloads.find(payloadId);
    }

    public createModelRefIndex(): ModelRefIndex {
        return ModelRefIndex.fromObjects([...this.features, ...this.objects]);
    }

    public listFeatures(): readonly Feature[] {
        return this.features;
    }

    public listVisibleObjects(): readonly CadObject[] {
        return this.objects.filter((object) => object.visible);
    }

    public resolveModelRef(ref: ModelRef): ModelElement | null {
        return this.createModelRefIndex().find(ref);
    }

    public appendFeature(feature: Feature): PartStudio {
        return this.withFeatureStore(this.featureStore.set(feature));
    }

    public replaceFeature(feature: Feature): PartStudio {
        return this.withFeatureStore(this.featureStore.set(feature));
    }

    public removeFeature(featureId: FeatureId): PartStudio {
        return this.withFeatureStore(this.featureStore.remove(featureId));
    }

    public withFeatureStore(featureStore: ModelElementStore<Feature>): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            features: featureStore.list(),
            objects: this.objects,
            revision: getNextModelRevision(this.revision),
        });
    }

    public withObjectStore(objectStore: ModelElementStore<CadObject>): PartStudio {
        return new PartStudio({
            featurePayloads: this.featurePayloads,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            features: this.features,
            objects: objectStore.list(),
            revision: getNextModelRevision(this.revision),
        });
    }

    public withFeaturePayloads(featurePayloads: FeaturePayloadStore): PartStudio {
        return new PartStudio({
            featurePayloads,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            features: this.features,
            objects: this.objects,
            revision: getNextModelRevision(this.revision),
        });
    }

    public setFeaturePayload(payloadId: FeaturePayloadId, payload: FeaturePayload): PartStudio {
        return this.withFeaturePayloads(this.featurePayloads.set(payloadId, payload));
    }

    public removeFeaturePayload(payloadId: FeaturePayloadId): PartStudio {
        return this.withFeaturePayloads(this.featurePayloads.remove(payloadId));
    }
}

export class CadDocument extends DocumentModel {
    public readonly activePartStudioId: PartStudioId;
    public readonly partStudioStore: ModelElementStore<PartStudio>;
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
        const partStudioStore = ModelElementStore.fromEntities(partStudios);

        super({
            id,
            metadata: metadata ?? null,
            modelType: 'cad.document',
            name,
            properties: new Map<string, ModelPropertyValue>([
                ['activePartStudioId', activePartStudioId],
                ['partStudioCount', partStudios.length],
            ]),
            revision: revision ?? 0,
        });
        this.activePartStudioId = activePartStudioId;
        this.partStudioStore = partStudioStore;
        this.partStudios = partStudioStore.list();
    }

    public getActivePartStudio(): PartStudio {
        return (
            this.partStudioStore.find(this.activePartStudioId) ??
            this.partStudios[0] ??
            createEmptyPartStudio()
        );
    }

    public withActivePartStudioId(
        activePartStudioId: PartStudioId,
        revision = this.revision,
    ): CadDocument {
        return new CadDocument({
            activePartStudioId,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            partStudios: this.partStudios,
            revision,
        });
    }

    public withPartStudioStore(
        partStudioStore: ModelElementStore<PartStudio>,
        revision = this.revision,
    ): CadDocument {
        return new CadDocument({
            activePartStudioId: this.activePartStudioId,
            id: this.id,
            metadata: this.metadata,
            name: this.name,
            partStudios: partStudioStore.list(),
            revision,
        });
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
