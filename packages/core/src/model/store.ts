import type { ChangeRecorder } from '../editing/changeRecorder';
import type { OperationId } from '../editing/operation';
import type { IdentifiedModelEntity } from './base';

export class ModelEntityStore<
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    private readonly entities: ReadonlyMap<TId, TEntity>;

    constructor(entities?: Iterable<readonly [TId, TEntity]>) {
        const emptyEntities: readonly (readonly [TId, TEntity])[] = [];

        this.entities = new Map(entities ?? emptyEntities);
    }

    public static fromEntities<
        TEntity extends IdentifiedModelEntity<TId>,
        TId extends string = string,
    >(entities: readonly TEntity[]): ModelEntityStore<TEntity, TId> {
        return new ModelEntityStore(entities.map((entity) => [entity.id, entity]));
    }

    public find(id: TId): TEntity | null {
        return this.entities.get(id) ?? null;
    }

    public has(id: TId): boolean {
        return this.entities.has(id);
    }

    public edit(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly recorder: ChangeRecorder<ModelEntityStore<TEntity, TId>>;
    }): ModelEntityStoreEditor<TEntity, TId> {
        return new ModelEntityStoreEditor({
            createOperationId: input.createOperationId,
            createOperationLabel: input.createOperationLabel,
            recorder: input.recorder,
            store: this,
        });
    }

    public editMapped<TDocument>(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly getStore: (document: TDocument) => ModelEntityStore<TEntity, TId>;
        readonly recorder: ChangeRecorder<TDocument>;
        readonly replaceStore: (
            document: TDocument,
            store: ModelEntityStore<TEntity, TId>,
        ) => TDocument;
    }): MappedModelEntityStoreEditor<TDocument, TEntity, TId> {
        return new MappedModelEntityStoreEditor({
            createOperationId: input.createOperationId,
            createOperationLabel: input.createOperationLabel,
            getStore: input.getStore,
            recorder: input.recorder,
            replaceStore: input.replaceStore,
            store: this,
        });
    }

    public list(): readonly TEntity[] {
        return [...this.entities.values()];
    }

    public remove(id: TId): ModelEntityStore<TEntity, TId> {
        const next = new Map(this.entities);

        next.delete(id);

        return new ModelEntityStore(next);
    }

    public set(entity: TEntity): ModelEntityStore<TEntity, TId> {
        return new ModelEntityStore([...this.entities, [entity.id, entity]]);
    }
}

export class ModelEntityStoreEditor<
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    private readonly createOperationId: (action: string, entity: TEntity) => OperationId;
    private readonly createOperationLabel: (action: string, entity: TEntity) => string;
    private readonly recorder: ChangeRecorder<ModelEntityStore<TEntity, TId>>;
    private storeValue: ModelEntityStore<TEntity, TId>;

    constructor(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly recorder: ChangeRecorder<ModelEntityStore<TEntity, TId>>;
        readonly store: ModelEntityStore<TEntity, TId>;
    }) {
        this.createOperationId = input.createOperationId;
        this.createOperationLabel = input.createOperationLabel;
        this.recorder = input.recorder;
        this.storeValue = input.store;
    }

    public get store(): ModelEntityStore<TEntity, TId> {
        return this.storeValue;
    }

    public add(entity: TEntity): ModelEntityStore<TEntity, TId> {
        if (this.storeValue.has(entity.id)) {
            throw new Error(`Cannot add model entity ${entity.id}: entity already exists.`);
        }

        const operation = new AddModelEntityOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('add', entity),
            label: this.createOperationLabel('add', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.record(operation);

        return this.storeValue;
    }

    public remove(entityId: TId): ModelEntityStore<TEntity, TId> {
        const entity = this.storeValue.find(entityId);

        if (!entity) {
            return this.storeValue;
        }

        const operation = new RemoveModelEntityOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('remove', entity),
            label: this.createOperationLabel('remove', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.record(operation);

        return this.storeValue;
    }

    public replace(entity: TEntity): ModelEntityStore<TEntity, TId> {
        const previousEntity = this.storeValue.find(entity.id);

        if (!previousEntity) {
            throw new Error(`Cannot replace model entity ${entity.id}: entity does not exist.`);
        }

        const operation = new ReplaceModelEntityOperation<TEntity, TId>({
            id: this.createOperationId('replace', entity),
            label: this.createOperationLabel('replace', entity),
            nextEntity: entity,
            previousEntity,
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.record(operation);

        return this.storeValue;
    }
}

export class MappedModelEntityStoreEditor<
    TDocument,
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    private readonly createOperationId: (action: string, entity: TEntity) => OperationId;
    private readonly createOperationLabel: (action: string, entity: TEntity) => string;
    private readonly getStore: (document: TDocument) => ModelEntityStore<TEntity, TId>;
    private readonly recorder: ChangeRecorder<TDocument>;
    private readonly replaceStore: (
        document: TDocument,
        store: ModelEntityStore<TEntity, TId>,
    ) => TDocument;
    private storeValue: ModelEntityStore<TEntity, TId>;

    constructor(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly getStore: (document: TDocument) => ModelEntityStore<TEntity, TId>;
        readonly recorder: ChangeRecorder<TDocument>;
        readonly replaceStore: (
            document: TDocument,
            store: ModelEntityStore<TEntity, TId>,
        ) => TDocument;
        readonly store: ModelEntityStore<TEntity, TId>;
    }) {
        this.createOperationId = input.createOperationId;
        this.createOperationLabel = input.createOperationLabel;
        this.getStore = input.getStore;
        this.recorder = input.recorder;
        this.replaceStore = input.replaceStore;
        this.storeValue = input.store;
    }

    public get store(): ModelEntityStore<TEntity, TId> {
        return this.storeValue;
    }

    public add(entity: TEntity): ModelEntityStore<TEntity, TId> {
        if (this.storeValue.has(entity.id)) {
            throw new Error(`Cannot add model entity ${entity.id}: entity already exists.`);
        }

        const operation = new AddModelEntityOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('add', entity),
            label: this.createOperationLabel('add', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.recordMapped({
            get: this.getStore,
            operation,
            replace: this.replaceStore,
        });

        return this.storeValue;
    }

    public remove(entityId: TId): ModelEntityStore<TEntity, TId> {
        const entity = this.storeValue.find(entityId);

        if (!entity) {
            return this.storeValue;
        }

        const operation = new RemoveModelEntityOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('remove', entity),
            label: this.createOperationLabel('remove', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.recordMapped({
            get: this.getStore,
            operation,
            replace: this.replaceStore,
        });

        return this.storeValue;
    }

    public replace(entity: TEntity): ModelEntityStore<TEntity, TId> {
        const previousEntity = this.storeValue.find(entity.id);

        if (!previousEntity) {
            throw new Error(`Cannot replace model entity ${entity.id}: entity does not exist.`);
        }

        const operation = new ReplaceModelEntityOperation<TEntity, TId>({
            id: this.createOperationId('replace', entity),
            label: this.createOperationLabel('replace', entity),
            nextEntity: entity,
            previousEntity,
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.recordMapped({
            get: this.getStore,
            operation,
            replace: this.replaceStore,
        });

        return this.storeValue;
    }
}

export class AddModelEntityOperation<
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    public readonly entity: TEntity;
    public readonly id: OperationId;
    public readonly label: string;

    constructor(input: {
        readonly entity: TEntity;
        readonly id: OperationId;
        readonly label: string;
    }) {
        this.entity = input.entity;
        this.id = input.id;
        this.label = input.label;
    }

    public apply(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        if (store.has(this.entity.id)) {
            throw new Error(
                `Cannot apply add model entity ${this.entity.id}: entity already exists.`,
            );
        }

        return store.set(this.entity);
    }

    public revert(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        return store.remove(this.entity.id);
    }
}

export class RemoveModelEntityOperation<
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    public readonly entity: TEntity;
    public readonly id: OperationId;
    public readonly label: string;

    constructor(input: {
        readonly entity: TEntity;
        readonly id: OperationId;
        readonly label: string;
    }) {
        this.entity = input.entity;
        this.id = input.id;
        this.label = input.label;
    }

    public apply(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        return store.remove(this.entity.id);
    }

    public revert(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        return store.set(this.entity);
    }
}

export class ReplaceModelEntityOperation<
    TEntity extends IdentifiedModelEntity<TId>,
    TId extends string = string,
> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly nextEntity: TEntity;
    public readonly previousEntity: TEntity;

    constructor(input: {
        readonly id: OperationId;
        readonly label: string;
        readonly nextEntity: TEntity;
        readonly previousEntity: TEntity;
    }) {
        this.id = input.id;
        this.label = input.label;
        this.nextEntity = input.nextEntity;
        this.previousEntity = input.previousEntity;
    }

    public apply(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        return store.set(this.nextEntity);
    }

    public revert(store: ModelEntityStore<TEntity, TId>): ModelEntityStore<TEntity, TId> {
        return store.set(this.previousEntity);
    }
}
