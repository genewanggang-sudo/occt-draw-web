import type { DocumentId } from '../ids';
import { createModelRef, type ModelRef } from './refs';
import {
    ModelPropertyBag,
    type ModelPropertyDefinition,
    type ModelPropertyKey,
    type ModelPropertyValue,
} from './properties';

export type ModelObjectId = string;
export type ModelObjectType = string;

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
