import type { DocumentId } from '../ids';
import {
    ModelPropertyBag,
    type ModelPropertyDefinition,
    type ModelPropertyKey,
    type ModelPropertyValue,
} from './properties';
import { createModelRef, type ModelRef } from './refs';

export type ModelElementId = string;
export type ModelElementType = string;

export interface ModelElementInput<TId extends string = string> {
    readonly id: TId;
    readonly metadata?: ReadonlyMap<string, unknown> | null;
    readonly modelType: ModelElementType;
    readonly name: string;
    readonly properties?:
        | ModelPropertyBag
        | ReadonlyMap<ModelPropertyKey, ModelPropertyValue>
        | null;
    readonly revision?: number;
}

export interface IdentifiedModelElement<TId extends string = string> {
    readonly id: TId;
}

export interface NamedModelElement<
    TId extends string = string,
> extends IdentifiedModelElement<TId> {
    readonly name: string;
}

export interface ModelElement<TId extends string = string> extends NamedModelElement<TId> {
    readonly metadata: ReadonlyMap<string, unknown>;
    readonly modelType: ModelElementType;
    readonly properties: ModelPropertyBag;
    readonly revision: number;
    getDefinedProperty<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
    ): ModelPropertyValue | null;
    getNumberProperty(key: ModelPropertyKey, fallback?: number): number;
    getProperty(key: ModelPropertyKey): ModelPropertyValue | null;
    getStringProperty(key: ModelPropertyKey, fallback?: string): string;
    nextRevision(): this;
    toRef(kind?: ModelElementType): ModelRef<TId>;
    withRevision(revision: number): this;
}

export abstract class BaseModelElement<TId extends string = string> implements ModelElement<TId> {
    public readonly id: TId;
    public readonly metadata: ReadonlyMap<string, unknown>;
    public readonly modelType: ModelElementType;
    public readonly name: string;
    private propertiesValue: ModelPropertyBag;
    private revisionValue: number;

    protected constructor(input: ModelElementInput<TId>) {
        this.id = input.id;
        this.metadata = new Map(input.metadata ?? []);
        this.modelType = input.modelType;
        this.name = input.name;
        this.propertiesValue =
            input.properties instanceof ModelPropertyBag
                ? input.properties
                : new ModelPropertyBag(input.properties ?? []);
        this.revisionValue = input.revision ?? 0;
    }

    public get properties(): ModelPropertyBag {
        return this.propertiesValue;
    }

    public get revision(): number {
        return this.revisionValue;
    }

    public nextRevision(): this {
        return this.withRevision(this.revision + 1);
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

    public toRef(kind?: ModelElementType): ModelRef<TId> {
        return createModelRef({
            id: this.id,
            kind: kind ?? this.modelType,
        });
    }

    public withRevision(revision: number): this {
        this.revisionValue = revision;

        return this;
    }
}

export abstract class DocumentModel<
    TDocumentId extends string = DocumentId,
> extends BaseModelElement<TDocumentId> {
    protected constructor(input: ModelElementInput<TDocumentId>) {
        super(input);
    }
}

export function setNextModelRevision<TElement extends ModelElement>(
    element: TElement,
    previousRevision: number,
): TElement {
    return element.withRevision(getNextModelRevision(previousRevision));
}

export function getNextModelRevision(previousRevision: number): number {
    return previousRevision + 1;
}
