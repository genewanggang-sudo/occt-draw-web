import type { Operation, OperationId } from '../editing/operation';
import type {
    ModelPropertyBag,
    ModelPropertyKey,
    ModelPropertyPath,
    ModelPropertyValue,
} from './properties';
import type { ModelRef } from './refs';

export type ModelEntityChangeAction = 'add' | 'remove';

export class ModelEntityChangeOperation<
    TDocument = unknown,
    TEntity extends object = object,
    TRef extends ModelRef = ModelRef,
> implements Operation<TDocument> {
    public readonly action: ModelEntityChangeAction;
    public readonly entity: TEntity;
    public readonly id: OperationId;
    public readonly label: string;
    public readonly modelRef: TRef;
    private readonly addEntity: (document: TDocument, entity: TEntity) => TDocument;
    private readonly removeEntity: (document: TDocument, modelRef: TRef) => TDocument;

    constructor(input: {
        readonly action: ModelEntityChangeAction;
        readonly addEntity: (document: TDocument, entity: TEntity) => TDocument;
        readonly entity: TEntity;
        readonly id: OperationId;
        readonly label: string;
        readonly modelRef: TRef;
        readonly removeEntity: (document: TDocument, modelRef: TRef) => TDocument;
    }) {
        this.action = input.action;
        this.addEntity = input.addEntity;
        this.entity = input.entity;
        this.id = input.id;
        this.label = input.label;
        this.modelRef = input.modelRef;
        this.removeEntity = input.removeEntity;
    }

    public apply(document: TDocument): TDocument {
        return this.action === 'add'
            ? this.addEntity(document, this.entity)
            : this.removeEntity(document, this.modelRef);
    }

    public revert(document: TDocument): TDocument {
        return this.action === 'add'
            ? this.removeEntity(document, this.modelRef)
            : this.addEntity(document, this.entity);
    }
}

export class ModelPropertyChangeOperation<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue extends ModelPropertyValue = ModelPropertyValue,
> implements Operation<TDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly modelRef: TRef;
    public readonly nextValue: TValue;
    public readonly previousValue: TValue;
    public readonly propertyPath: ModelPropertyPath;
    private readonly applyPropertyChange: (
        document: TDocument,
        modelRef: TRef,
        propertyPath: ModelPropertyPath,
        value: TValue,
    ) => TDocument;

    constructor(input: {
        readonly applyPropertyChange: (
            document: TDocument,
            modelRef: TRef,
            propertyPath: ModelPropertyPath,
            value: TValue,
        ) => TDocument;
        readonly id: OperationId;
        readonly label: string;
        readonly modelRef: TRef;
        readonly nextValue: TValue;
        readonly previousValue: TValue;
        readonly propertyPath: ModelPropertyPath;
    }) {
        this.applyPropertyChange = input.applyPropertyChange;
        this.id = input.id;
        this.label = input.label;
        this.modelRef = input.modelRef;
        this.nextValue = input.nextValue;
        this.previousValue = input.previousValue;
        this.propertyPath = [...input.propertyPath];
    }

    public apply(document: TDocument): TDocument {
        return this.applyPropertyChange(document, this.modelRef, this.propertyPath, this.nextValue);
    }

    public revert(document: TDocument): TDocument {
        return this.applyPropertyChange(
            document,
            this.modelRef,
            this.propertyPath,
            this.previousValue,
        );
    }
}

export class SetModelPropertyOperation<TModel = unknown> implements Operation<TModel> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly modelRef: ModelRef;
    public readonly nextValue: ModelPropertyValue;
    public readonly previousValue: ModelPropertyValue;
    public readonly propertyKey: ModelPropertyKey;
    private readonly getProperties: (model: TModel) => ModelPropertyBag;
    private readonly replaceProperties: (model: TModel, properties: ModelPropertyBag) => TModel;

    constructor(input: {
        readonly getProperties: (model: TModel) => ModelPropertyBag;
        readonly id: OperationId;
        readonly label: string;
        readonly modelRef: ModelRef;
        readonly nextValue: ModelPropertyValue;
        readonly previousValue: ModelPropertyValue;
        readonly propertyKey: ModelPropertyKey;
        readonly replaceProperties: (model: TModel, properties: ModelPropertyBag) => TModel;
    }) {
        this.getProperties = input.getProperties;
        this.id = input.id;
        this.label = input.label;
        this.modelRef = input.modelRef;
        this.nextValue = input.nextValue;
        this.previousValue = input.previousValue;
        this.propertyKey = input.propertyKey;
        this.replaceProperties = input.replaceProperties;
    }

    public apply(model: TModel): TModel {
        return this.replaceProperties(
            model,
            this.getProperties(model).set(this.propertyKey, this.nextValue),
        );
    }

    public revert(model: TModel): TModel {
        return this.replaceProperties(
            model,
            this.getProperties(model).set(this.propertyKey, this.previousValue),
        );
    }
}

export function createSetModelPropertyOperation<
    TModel extends { readonly properties: ModelPropertyBag },
>(input: {
    readonly id: OperationId;
    readonly label: string;
    readonly model: TModel;
    readonly modelRef: ModelRef;
    readonly nextValue: ModelPropertyValue;
    readonly propertyKey: ModelPropertyKey;
    readonly replaceProperties: (model: TModel, properties: ModelPropertyBag) => TModel;
}): SetModelPropertyOperation<TModel> {
    return new SetModelPropertyOperation({
        getProperties: (model) => model.properties,
        id: input.id,
        label: input.label,
        modelRef: input.modelRef,
        nextValue: input.nextValue,
        previousValue: input.model.properties.find(input.propertyKey),
        propertyKey: input.propertyKey,
        replaceProperties: input.replaceProperties,
    });
}
