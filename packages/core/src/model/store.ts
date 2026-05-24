import type { ChangeRecorder } from '../editing/changeRecorder';
import type { OperationId } from '../editing/operation';
import { setNextModelRevision, type IdentifiedModelElement, type ModelElement } from './base';

export class ModelElementStore<
    TEntity extends IdentifiedModelElement<TId>,
    TId extends string = string,
> {
    private readonly entities: ReadonlyMap<TId, TEntity>;

    constructor(entities?: Iterable<readonly [TId, TEntity]>) {
        const emptyEntities: readonly (readonly [TId, TEntity])[] = [];

        this.entities = new Map(entities ?? emptyEntities);
    }

    public static fromEntities<
        TEntity extends IdentifiedModelElement<TId>,
        TId extends string = string,
    >(entities: readonly TEntity[]): ModelElementStore<TEntity, TId> {
        return new ModelElementStore(entities.map((entity) => [entity.id, entity]));
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
        readonly recorder: ChangeRecorder<ModelElementStore<TEntity, TId>>;
    }): ModelElementStoreEditor<TEntity, TId> {
        return new ModelElementStoreEditor({
            createOperationId: input.createOperationId,
            createOperationLabel: input.createOperationLabel,
            recorder: input.recorder,
            store: this,
        });
    }

    public editMapped<TDocument>(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly getStore: (document: TDocument) => ModelElementStore<TEntity, TId>;
        readonly recorder: ChangeRecorder<TDocument>;
        readonly replaceStore: (
            document: TDocument,
            store: ModelElementStore<TEntity, TId>,
        ) => TDocument;
    }): MappedModelElementStoreEditor<TDocument, TEntity, TId> {
        return new MappedModelElementStoreEditor({
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

    public remove(id: TId): ModelElementStore<TEntity, TId> {
        const next = new Map(this.entities);

        next.delete(id);

        return new ModelElementStore(next);
    }

    public set(entity: TEntity): ModelElementStore<TEntity, TId> {
        return new ModelElementStore([...this.entities, [entity.id, entity]]);
    }
}

export class ModelElementStoreEditor<
    TEntity extends IdentifiedModelElement<TId>,
    TId extends string = string,
> {
    private readonly createOperationId: (action: string, entity: TEntity) => OperationId;
    private readonly createOperationLabel: (action: string, entity: TEntity) => string;
    private readonly recorder: ChangeRecorder<ModelElementStore<TEntity, TId>>;
    private storeValue: ModelElementStore<TEntity, TId>;

    constructor(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly recorder: ChangeRecorder<ModelElementStore<TEntity, TId>>;
        readonly store: ModelElementStore<TEntity, TId>;
    }) {
        this.createOperationId = input.createOperationId;
        this.createOperationLabel = input.createOperationLabel;
        this.recorder = input.recorder;
        this.storeValue = input.store;
    }

    public get store(): ModelElementStore<TEntity, TId> {
        return this.storeValue;
    }

    public add(entity: TEntity): ModelElementStore<TEntity, TId> {
        if (this.storeValue.has(entity.id)) {
            throw new Error(`Cannot add model entity ${entity.id}: entity already exists.`);
        }

        const operation = new AddModelElementOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('add', entity),
            label: this.createOperationLabel('add', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.record(operation);

        return this.storeValue;
    }

    public remove(entityId: TId): ModelElementStore<TEntity, TId> {
        const entity = this.storeValue.find(entityId);

        if (!entity) {
            return this.storeValue;
        }

        const operation = new RemoveModelElementOperation<TEntity, TId>({
            entity,
            id: this.createOperationId('remove', entity),
            label: this.createOperationLabel('remove', entity),
        });

        this.storeValue = operation.apply(this.storeValue);
        this.recorder.record(operation);

        return this.storeValue;
    }

    public replace(entity: TEntity): ModelElementStore<TEntity, TId> {
        const previousEntity = this.storeValue.find(entity.id);

        if (!previousEntity) {
            throw new Error(`Cannot replace model entity ${entity.id}: entity does not exist.`);
        }

        const operation = new ReplaceModelElementOperation<TEntity, TId>({
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

export class MappedModelElementStoreEditor<
    TDocument,
    TEntity extends IdentifiedModelElement<TId>,
    TId extends string = string,
> {
    private readonly createOperationId: (action: string, entity: TEntity) => OperationId;
    private readonly createOperationLabel: (action: string, entity: TEntity) => string;
    private readonly getStore: (document: TDocument) => ModelElementStore<TEntity, TId>;
    private readonly recorder: ChangeRecorder<TDocument>;
    private readonly replaceStore: (
        document: TDocument,
        store: ModelElementStore<TEntity, TId>,
    ) => TDocument;
    private storeValue: ModelElementStore<TEntity, TId>;

    constructor(input: {
        readonly createOperationId: (action: string, entity: TEntity) => OperationId;
        readonly createOperationLabel: (action: string, entity: TEntity) => string;
        readonly getStore: (document: TDocument) => ModelElementStore<TEntity, TId>;
        readonly recorder: ChangeRecorder<TDocument>;
        readonly replaceStore: (
            document: TDocument,
            store: ModelElementStore<TEntity, TId>,
        ) => TDocument;
        readonly store: ModelElementStore<TEntity, TId>;
    }) {
        this.createOperationId = input.createOperationId;
        this.createOperationLabel = input.createOperationLabel;
        this.getStore = input.getStore;
        this.recorder = input.recorder;
        this.replaceStore = input.replaceStore;
        this.storeValue = input.store;
    }

    public get store(): ModelElementStore<TEntity, TId> {
        return this.storeValue;
    }

    public add(entity: TEntity): ModelElementStore<TEntity, TId> {
        if (this.storeValue.has(entity.id)) {
            throw new Error(`Cannot add model entity ${entity.id}: entity already exists.`);
        }

        const operation = new AddModelElementOperation<TEntity, TId>({
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

    public remove(entityId: TId): ModelElementStore<TEntity, TId> {
        const entity = this.storeValue.find(entityId);

        if (!entity) {
            return this.storeValue;
        }

        const operation = new RemoveModelElementOperation<TEntity, TId>({
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

    public replace(entity: TEntity): ModelElementStore<TEntity, TId> {
        const previousEntity = this.storeValue.find(entity.id);

        if (!previousEntity) {
            throw new Error(`Cannot replace model entity ${entity.id}: entity does not exist.`);
        }

        const operation = new ReplaceModelElementOperation<TEntity, TId>({
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

export class AddModelElementOperation<
    TEntity extends IdentifiedModelElement<TId>,
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

    public apply(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        if (store.has(this.entity.id)) {
            throw new Error(
                `Cannot apply add model entity ${this.entity.id}: entity already exists.`,
            );
        }

        return store.set(this.entity);
    }

    public revert(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        return store.remove(this.entity.id);
    }
}

export class RemoveModelElementOperation<
    TEntity extends IdentifiedModelElement<TId>,
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

    public apply(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        return store.remove(this.entity.id);
    }

    public revert(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        return store.set(this.entity);
    }
}

export class ReplaceModelElementOperation<
    TEntity extends IdentifiedModelElement<TId>,
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

    public apply(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        return store.set(nextRevisionFrom(this.nextEntity, this.previousEntity));
    }

    public revert(store: ModelElementStore<TEntity, TId>): ModelElementStore<TEntity, TId> {
        return store.set(this.previousEntity);
    }
}

function nextRevisionFrom<TEntity extends IdentifiedModelElement>(
    entity: TEntity,
    previousEntity: TEntity,
): TEntity {
    if (isModelElement(entity) && isModelElement(previousEntity)) {
        setNextModelRevision(entity, previousEntity.revision);
    }

    return entity;
}

function isModelElement<TEntity extends IdentifiedModelElement>(
    entity: TEntity,
): entity is TEntity & ModelElement {
    return (
        'nextRevision' in entity &&
        typeof entity.nextRevision === 'function' &&
        'withRevision' in entity &&
        typeof entity.withRevision === 'function'
    );
}
