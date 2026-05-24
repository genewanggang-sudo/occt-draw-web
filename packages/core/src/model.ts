import type { DocumentId } from './ids';

export type ModelObjectId = string;
export type ModelObjectType = string;
export type ModelPropertyKey = string;
export type ModelPropertyPath = readonly ModelPropertyKey[];
export type ModelPropertyValue = boolean | null | number | object | string;

export interface ModelProperty<TValue extends ModelPropertyValue = ModelPropertyValue> {
    readonly key: ModelPropertyKey;
    readonly value: TValue;
}

export interface ModelPropertyDefinition<TValue extends ModelPropertyValue = ModelPropertyValue> {
    readonly defaultValue?: TValue | undefined;
    readonly key: ModelPropertyKey;
    readonly serialize?: ((value: TValue) => ModelPropertyValue) | undefined;
    readonly validate?: ((value: TValue) => void) | undefined;
}

export function defineModelProperty<TValue extends ModelPropertyValue = ModelPropertyValue>(
    definition: ModelPropertyDefinition<TValue>,
): ModelPropertyDefinition<TValue> {
    return definition;
}

export class ModelPropertyBag {
    private readonly properties: ReadonlyMap<ModelPropertyKey, ModelPropertyValue>;

    constructor(properties?: Iterable<readonly [ModelPropertyKey, ModelPropertyValue]>) {
        this.properties = new Map(properties ?? []);
    }

    public entries(): readonly (readonly [ModelPropertyKey, ModelPropertyValue])[] {
        return [...this.properties.entries()];
    }

    public find(key: ModelPropertyKey): ModelPropertyValue | null {
        return this.properties.get(key) ?? null;
    }

    public get<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
    ): ModelPropertyValue | null {
        const value = this.find(definition.key);

        return value ?? definition.defaultValue ?? null;
    }

    public has(key: ModelPropertyKey): boolean {
        return this.properties.has(key);
    }

    public remove(key: ModelPropertyKey): ModelPropertyBag {
        if (!this.properties.has(key)) {
            return this;
        }

        const next = new Map(this.properties);

        next.delete(key);

        return new ModelPropertyBag(next);
    }

    public require(key: ModelPropertyKey): ModelPropertyValue {
        const value = this.find(key);

        if (value === null) {
            throw new Error(`Missing model property "${key}".`);
        }

        return value;
    }

    public set(key: ModelPropertyKey, value: ModelPropertyValue): ModelPropertyBag {
        return new ModelPropertyBag([...this.properties, [key, value]]);
    }

    public setDefined<TValue extends ModelPropertyValue = ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
        value: TValue,
    ): ModelPropertyBag {
        definition.validate?.(value);

        return this.set(definition.key, definition.serialize?.(value) ?? value);
    }

    public toReadonlyMap(): ReadonlyMap<ModelPropertyKey, ModelPropertyValue> {
        return new Map(this.properties);
    }
}

export interface ModelRef<TId extends string = string, TKind extends string = string> {
    readonly id: TId;
    readonly kind: TKind;
    readonly ownerId?: string | undefined;
}

export type ObjectRef<TId extends string = string, TKind extends string = string> = ModelRef<
    TId,
    TKind
>;

export function createModelRef<TId extends string, TKind extends string>(input: {
    readonly id: TId;
    readonly kind: TKind;
    readonly ownerId?: string | undefined;
}): ModelRef<TId, TKind> {
    const ref: ModelRef<TId, TKind> = {
        id: input.id,
        kind: input.kind,
    };

    return input.ownerId === undefined ? ref : { ...ref, ownerId: input.ownerId };
}

export interface ModelObjectInput<TId extends string = string> {
    readonly id: TId;
    readonly metadata?: ReadonlyMap<string, unknown> | null;
    readonly modelType: ModelObjectType;
    readonly name: string;
    readonly properties?:
        | ModelPropertyBag
        | ReadonlyMap<ModelPropertyKey, ModelPropertyValue>
        | null;
}

export type ModelEntityInput<TId extends string = string> = ModelObjectInput<TId>;

export interface RevisionedModelEntityInput<
    TId extends string = string,
> extends ModelObjectInput<TId> {
    readonly revision?: number;
}

export interface IdentifiedModelEntity<TId extends string = string> {
    readonly id: TId;
}

export interface NamedModelEntity<TId extends string = string> extends IdentifiedModelEntity<TId> {
    readonly name: string;
}

export interface RevisionedModelEntity<TId extends string = string> extends NamedModelEntity<TId> {
    readonly revision: number;
}

export interface ModelObject<TId extends string = string> extends NamedModelEntity<TId> {
    readonly metadata: ReadonlyMap<string, unknown>;
    readonly modelType: ModelObjectType;
    readonly properties: ModelPropertyBag;
    getDefinedProperty<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
    ): ModelPropertyValue | null;
    getNumberProperty(key: ModelPropertyKey, fallback?: number): number;
    getProperty(key: ModelPropertyKey): ModelPropertyValue | null;
    getStringProperty(key: ModelPropertyKey, fallback?: string): string;
    toRef(kind?: ModelObjectType): ModelRef<TId>;
}

export interface ModelRefResolver {
    find(ref: ModelRef): ModelObject | null;
    has(ref: ModelRef): boolean;
    require(ref: ModelRef): ModelObject;
}

export class ModelRefIndex implements ModelRefResolver {
    private readonly objects: ReadonlyMap<string, ModelObject>;

    constructor(objects: readonly ModelObject[] = []) {
        this.objects = new Map(
            objects.map((object) => [createModelRefKey(object.toRef()), object]),
        );
    }

    public add(object: ModelObject): ModelRefIndex {
        return new ModelRefIndex([...this.objects.values(), object]);
    }

    public find(ref: ModelRef): ModelObject | null {
        const object = this.objects.get(createModelRefKey(ref)) ?? null;

        return object?.modelType === ref.kind ? object : null;
    }

    public has(ref: ModelRef): boolean {
        return this.find(ref) !== null;
    }

    public require(ref: ModelRef): ModelObject {
        const object = this.find(ref);

        if (!object) {
            throw new Error(`Missing model ref "${ref.kind}:${ref.id}".`);
        }

        return object;
    }

    public static fromObjects(objects: readonly ModelObject[]): ModelRefIndex {
        return new ModelRefIndex(objects);
    }
}

function createModelRefKey(ref: ModelRef): string {
    return ref.ownerId ? `${ref.ownerId}:${ref.kind}:${ref.id}` : `${ref.kind}:${ref.id}`;
}

export abstract class BaseModelObject<TId extends string = string> implements ModelObject<TId> {
    public readonly id: TId;
    public readonly metadata: ReadonlyMap<string, unknown>;
    public readonly modelType: ModelObjectType;
    public readonly name: string;
    private propertiesValue: ModelPropertyBag;

    protected constructor(input: ModelObjectInput<TId>) {
        this.id = input.id;
        this.metadata = new Map(input.metadata ?? []);
        this.modelType = input.modelType;
        this.name = input.name;
        this.propertiesValue =
            input.properties instanceof ModelPropertyBag
                ? input.properties
                : new ModelPropertyBag(input.properties ?? []);
    }

    public get properties(): ModelPropertyBag {
        return this.propertiesValue;
    }

    public getProperty(key: ModelPropertyKey): ModelPropertyValue | null {
        return this.properties.find(key);
    }

    public getDefinedProperty<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
    ): ModelPropertyValue | null {
        return this.properties.get(definition);
    }

    public getNumberProperty(key: ModelPropertyKey, fallback = 0): number {
        const value = this.getProperty(key);

        return typeof value === 'number' ? value : fallback;
    }

    public getStringProperty(key: ModelPropertyKey, fallback = ''): string {
        const value = this.getProperty(key);

        return typeof value === 'string' ? value : fallback;
    }

    protected setPropertyValue(key: ModelPropertyKey, value: ModelPropertyValue): void {
        this.propertiesValue = this.propertiesValue.set(key, value);
    }

    protected setDefinedPropertyValue<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
        value: TValue,
    ): void {
        this.propertiesValue = this.propertiesValue.setDefined(definition, value);
    }

    public toRef(kind?: ModelObjectType): ModelRef<TId> {
        return createModelRef({
            id: this.id,
            kind: kind ?? this.modelType,
        });
    }
}

export abstract class BaseModelEntity<TId extends string = string> extends BaseModelObject<TId> {}

export abstract class BaseRevisionedModelEntity<TId extends string = string>
    extends BaseModelObject<TId>
    implements RevisionedModelEntity<TId>
{
    public readonly revision: number;

    protected constructor(input: RevisionedModelEntityInput<TId>) {
        super(input);
        this.revision = input.revision ?? 0;
    }
}

export abstract class BaseDocumentModel<
    TDocumentId extends string = DocumentId,
> extends BaseRevisionedModelEntity<TDocumentId> {
    protected constructor(input: RevisionedModelEntityInput<TDocumentId>) {
        super(input);
    }
}
