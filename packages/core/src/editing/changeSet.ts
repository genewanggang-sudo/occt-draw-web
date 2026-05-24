import type { ModelPropertyPath } from '../model/properties';
import type { ModelRef } from '../model/refs';

export type ModelChangeId = string;
export type ModelChangeKey = string;
export type ModelPropertyChangeKey = string;

export function createModelChangeId(prefix: string, entityId: string): ModelChangeId {
    return `${prefix}:${entityId}`;
}

export interface ModelElementChangeTarget<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    add(document: TDocument, ref: TRef, value: TValue): TDocument;
    remove(document: TDocument, ref: TRef): TDocument;
}

export interface ModelPropertyChangeTarget<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    set(document: TDocument, ref: TRef, propertyPath: ModelPropertyPath, value: TValue): TDocument;
}

export interface ModelAddedChange<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    readonly id: ModelChangeId;
    readonly label: string;
    readonly ref: TRef;
    readonly target: ModelElementChangeTarget<TDocument, TRef, TValue>;
    readonly value: TValue;
}

export interface ModelDeletedChange<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    readonly id: ModelChangeId;
    readonly label: string;
    readonly ref: TRef;
    readonly target: ModelElementChangeTarget<TDocument, TRef, TValue>;
    readonly value: TValue;
}

export interface ModelPropertyValueChange<TValue = unknown> {
    readonly after: TValue;
    readonly before: TValue;
    readonly propertyPath: ModelPropertyPath;
}

export interface ModelUpdatedChange<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    readonly id: ModelChangeId;
    readonly label: string;
    readonly properties: ReadonlyMap<ModelPropertyChangeKey, ModelPropertyValueChange<TValue>>;
    readonly ref: TRef;
    readonly target: ModelPropertyChangeTarget<TDocument, TRef, TValue>;
}

export class ModelChangeSet<TDocument = unknown> {
    public readonly added: ReadonlyMap<ModelChangeKey, ModelAddedChange<TDocument>>;
    public readonly deleted: ReadonlyMap<ModelChangeKey, ModelDeletedChange<TDocument>>;
    public readonly updated: ReadonlyMap<ModelChangeKey, ModelUpdatedChange<TDocument>>;

    constructor(
        input: {
            readonly added?: ReadonlyMap<ModelChangeKey, ModelAddedChange<TDocument>>;
            readonly deleted?: ReadonlyMap<ModelChangeKey, ModelDeletedChange<TDocument>>;
            readonly updated?: ReadonlyMap<ModelChangeKey, ModelUpdatedChange<TDocument>>;
        } = {},
    ) {
        this.added = new Map(input.added ?? []);
        this.deleted = new Map(input.deleted ?? []);
        this.updated = cloneUpdatedChanges(input.updated ?? new Map());
    }

    public apply(document: TDocument): TDocument {
        let nextDocument = document;

        for (const change of this.added.values()) {
            nextDocument = change.target.add(nextDocument, change.ref, change.value);
        }

        for (const change of this.updated.values()) {
            for (const propertyChange of change.properties.values()) {
                nextDocument = change.target.set(
                    nextDocument,
                    change.ref,
                    propertyChange.propertyPath,
                    propertyChange.after,
                );
            }
        }

        for (const change of this.deleted.values()) {
            nextDocument = change.target.remove(nextDocument, change.ref);
        }

        return nextDocument;
    }

    public revert(document: TDocument): TDocument {
        let nextDocument = document;

        for (const change of Array.from(this.deleted.values()).reverse()) {
            nextDocument = change.target.add(nextDocument, change.ref, change.value);
        }

        for (const change of Array.from(this.updated.values()).reverse()) {
            for (const propertyChange of Array.from(change.properties.values()).reverse()) {
                nextDocument = change.target.set(
                    nextDocument,
                    change.ref,
                    propertyChange.propertyPath,
                    propertyChange.before,
                );
            }
        }

        for (const change of Array.from(this.added.values()).reverse()) {
            nextDocument = change.target.remove(nextDocument, change.ref);
        }

        return nextDocument;
    }

    public isEmpty(): boolean {
        return this.added.size === 0 && this.updated.size === 0 && this.deleted.size === 0;
    }

    public map<TOuter>(input: {
        readonly get: (outer: TOuter) => TDocument;
        readonly replace: (outer: TOuter, inner: TDocument) => TOuter;
    }): ModelChangeSet<TOuter> {
        const builder = new ModelChangeSetBuilder<TOuter>();

        for (const [key, change] of this.added) {
            builder.recordAdd({
                ...change,
                key,
                target: mapElementTarget(change.target, input),
            });
        }

        for (const [key, change] of this.updated) {
            builder.recordUpdateGroup({
                ...change,
                key,
                target: mapPropertyTarget(change.target, input),
            });
        }

        for (const [key, change] of this.deleted) {
            builder.recordDelete({
                ...change,
                key,
                target: mapElementTarget(change.target, input),
            });
        }

        return builder.toChangeSet();
    }

    public mergeWith(changeSet: ModelChangeSet<TDocument>): ModelChangeSet<TDocument> {
        const builder = ModelChangeSetBuilder.from(this);

        builder.recordChangeSet(changeSet);

        return builder.toChangeSet();
    }

    public static empty<TDocument = unknown>(): ModelChangeSet<TDocument> {
        return new ModelChangeSet<TDocument>();
    }
}

export class ModelChangeSetBuilder<TDocument = unknown> {
    private readonly added = new Map<ModelChangeKey, ModelAddedChange<TDocument>>();
    private readonly deleted = new Map<ModelChangeKey, ModelDeletedChange<TDocument>>();
    private readonly updated = new Map<ModelChangeKey, ModelUpdatedChange<TDocument>>();

    public get count(): number {
        return this.added.size + this.updated.size + this.deleted.size;
    }

    public static from<TDocument>(
        changeSet: ModelChangeSet<TDocument>,
    ): ModelChangeSetBuilder<TDocument> {
        const builder = new ModelChangeSetBuilder<TDocument>();

        builder.recordChangeSet(changeSet);

        return builder;
    }

    public isEmpty(): boolean {
        return this.count === 0;
    }

    public recordAdd<TRef extends ModelRef, TValue>(
        input: ModelAddedChange<TDocument, TRef, TValue> & {
            readonly key?: ModelChangeKey;
        },
    ): void {
        const key = input.key ?? createModelChangeKey(input.ref);

        this.deleted.delete(key);
        this.added.set(key, input);
    }

    public recordDelete<TRef extends ModelRef, TValue>(
        input: ModelDeletedChange<TDocument, TRef, TValue> & {
            readonly key?: ModelChangeKey;
        },
    ): void {
        const key = input.key ?? createModelChangeKey(input.ref);

        if (this.added.has(key)) {
            this.added.delete(key);
            this.updated.delete(key);
            return;
        }

        this.updated.delete(key);
        this.deleted.set(key, input);
    }

    public recordUpdate<TRef extends ModelRef, TValue>(
        input: Omit<ModelUpdatedChange<TDocument, TRef, TValue>, 'properties'> & {
            readonly after: TValue;
            readonly before: TValue;
            readonly key?: ModelChangeKey;
            readonly propertyPath: ModelPropertyPath;
        },
    ): void {
        const key = input.key ?? createModelChangeKey(input.ref);
        const propertyKey = createModelPropertyChangeKey(input.propertyPath);
        const previousChange = this.updated.get(key);
        const nextProperties = new Map(previousChange?.properties ?? []);
        const previousProperty = nextProperties.get(propertyKey);

        nextProperties.set(propertyKey, {
            after: input.after,
            before: previousProperty?.before ?? input.before,
            propertyPath: [...input.propertyPath],
        });
        this.updated.set(key, {
            id: previousChange?.id ?? input.id,
            label: previousChange?.label ?? input.label,
            properties: nextProperties,
            ref: input.ref,
            target: input.target,
        });
    }

    public recordUpdateGroup<TRef extends ModelRef, TValue>(
        input: ModelUpdatedChange<TDocument, TRef, TValue> & {
            readonly key?: ModelChangeKey;
        },
    ): void {
        for (const propertyChange of input.properties.values()) {
            this.recordUpdate({
                after: propertyChange.after,
                before: propertyChange.before,
                id: input.id,
                label: input.label,
                propertyPath: propertyChange.propertyPath,
                ref: input.ref,
                target: input.target,
                ...(input.key === undefined ? {} : { key: input.key }),
            });
        }
    }

    public recordChangeSet(changeSet: ModelChangeSet<TDocument>): void {
        for (const [key, change] of changeSet.added) {
            this.recordAdd({ ...change, key });
        }
        for (const [key, change] of changeSet.updated) {
            this.recordUpdateGroup({ ...change, key });
        }
        for (const [key, change] of changeSet.deleted) {
            this.recordDelete({ ...change, key });
        }
    }

    public toChangeSet(): ModelChangeSet<TDocument> {
        return new ModelChangeSet({
            added: this.added,
            deleted: this.deleted,
            updated: this.updated,
        });
    }
}

export function createModelChangeKey(ref: ModelRef): ModelChangeKey {
    return `${ref.kind}:${ref.id}`;
}

export function createModelPropertyChangeKey(
    propertyPath: readonly string[],
): ModelPropertyChangeKey {
    return propertyPath.join('.');
}

function cloneUpdatedChanges<TDocument>(
    changes: ReadonlyMap<ModelChangeKey, ModelUpdatedChange<TDocument>>,
): ReadonlyMap<ModelChangeKey, ModelUpdatedChange<TDocument>> {
    const cloned = new Map<ModelChangeKey, ModelUpdatedChange<TDocument>>();

    for (const [key, change] of changes) {
        cloned.set(key, {
            ...change,
            properties: new Map(change.properties),
        });
    }

    return cloned;
}

function mapElementTarget<TOuter, TInner, TRef extends ModelRef, TValue>(
    target: ModelElementChangeTarget<TInner, TRef, TValue>,
    input: {
        readonly get: (outer: TOuter) => TInner;
        readonly replace: (outer: TOuter, inner: TInner) => TOuter;
    },
): ModelElementChangeTarget<TOuter, TRef, TValue> {
    return {
        add: (outer, ref, value) => input.replace(outer, target.add(input.get(outer), ref, value)),
        remove: (outer, ref) => input.replace(outer, target.remove(input.get(outer), ref)),
    };
}

function mapPropertyTarget<TOuter, TInner, TRef extends ModelRef, TValue>(
    target: ModelPropertyChangeTarget<TInner, TRef, TValue>,
    input: {
        readonly get: (outer: TOuter) => TInner;
        readonly replace: (outer: TOuter, inner: TInner) => TOuter;
    },
): ModelPropertyChangeTarget<TOuter, TRef, TValue> {
    return {
        set: (outer, ref, propertyPath, value) =>
            input.replace(outer, target.set(input.get(outer), ref, propertyPath, value)),
    };
}
