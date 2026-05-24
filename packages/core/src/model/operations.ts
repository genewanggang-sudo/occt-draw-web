import type { Operation, OperationId } from '../editing/operation';
import type { ModelElement } from './base';
import type {
    ModelPropertyBag,
    ModelPropertyKey,
    ModelPropertyPath,
    ModelPropertyValue,
} from './properties';
import type { ModelRef } from './refs';

export type ModelElementChangeAction = 'add' | 'remove';

export class ModelElementChangeOperation<
    TDocument extends object = object,
    TEntity extends object = object,
    TRef extends ModelRef = ModelRef,
> implements Operation<TDocument> {
    public readonly action: ModelElementChangeAction;
    public readonly entity: TEntity;
    public readonly id: OperationId;
    public readonly label: string;
    public readonly modelRef: TRef;
    private readonly addEntity: (document: TDocument, entity: TEntity) => TDocument;
    private readonly removeEntity: (document: TDocument, modelRef: TRef) => TDocument;
    private previousRevision: number | null = null;

    constructor(input: {
        readonly action: ModelElementChangeAction;
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
        this.previousRevision = readModelRevision(document);
        const nextDocument =
            this.action === 'add'
                ? this.addEntity(document, this.entity)
                : this.removeEntity(document, this.modelRef);

        return nextModelRevision(nextDocument);
    }

    public revert(document: TDocument): TDocument {
        const nextDocument =
            this.action === 'add'
                ? this.removeEntity(document, this.modelRef)
                : this.addEntity(document, this.entity);

        return restoreModelRevision(nextDocument, this.previousRevision);
    }
}

export class ModelPropertyChangeOperation<
    TDocument extends object = object,
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
    private previousRevision: number | null = null;

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
        this.previousRevision = readModelRevision(document);

        return nextModelRevision(
            this.applyPropertyChange(document, this.modelRef, this.propertyPath, this.nextValue),
        );
    }

    public revert(document: TDocument): TDocument {
        return restoreModelRevision(
            this.applyPropertyChange(
                document,
                this.modelRef,
                this.propertyPath,
                this.previousValue,
            ),
            this.previousRevision,
        );
    }
}

export class SetModelPropertyOperation<
    TModel extends object = object,
> implements Operation<TModel> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly modelRef: ModelRef;
    public readonly nextValue: ModelPropertyValue;
    public readonly previousValue: ModelPropertyValue;
    public readonly propertyKey: ModelPropertyKey;
    private readonly getProperties: (model: TModel) => ModelPropertyBag;
    private readonly replaceProperties: (model: TModel, properties: ModelPropertyBag) => TModel;
    private previousRevision: number | null = null;

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
        this.previousRevision = readModelRevision(model);

        return nextModelRevision(
            this.replaceProperties(
                model,
                this.getProperties(model).set(this.propertyKey, this.nextValue),
            ),
        );
    }

    public revert(model: TModel): TModel {
        return restoreModelRevision(
            this.replaceProperties(
                model,
                this.getProperties(model).set(this.propertyKey, this.previousValue),
            ),
            this.previousRevision,
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

function readModelRevision(model: object): number | null {
    return isModelElement(model) ? model.revision : null;
}

function nextModelRevision<TModel extends object>(model: TModel): TModel {
    if (isModelElement(model)) {
        model.nextRevision();
    }

    return model;
}

function restoreModelRevision<TModel extends object>(
    model: TModel,
    revision: number | null,
): TModel {
    if (revision !== null && isModelElement(model)) {
        model.withRevision(revision);
    }

    return model;
}

function isModelElement(model: object): model is ModelElement {
    return (
        'nextRevision' in model &&
        typeof model.nextRevision === 'function' &&
        'withRevision' in model &&
        typeof model.withRevision === 'function'
    );
}
