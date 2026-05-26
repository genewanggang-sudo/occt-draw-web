import type {
    ModelChangeTargetKind,
    SerializableModelChange,
    SerializableModelChangeSet,
} from './changeSet';
import type { ModelPropertyPath } from '../model/properties';
import type { ModelRef } from '../model/refs';

export interface ModelElementChangeApplier<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    add(document: TDocument, ref: TRef, value: TValue): TDocument;
    remove(document: TDocument, ref: TRef): TDocument;
}

export interface ModelPropertyChangeApplier<
    TDocument = unknown,
    TRef extends ModelRef = ModelRef,
    TValue = unknown,
> {
    set(document: TDocument, ref: TRef, propertyPath: ModelPropertyPath, value: TValue): TDocument;
}

interface RegisteredModelChangeApplier<TDocument = unknown> {
    readonly element?: ModelElementChangeApplier<TDocument> | undefined;
    readonly property?: ModelPropertyChangeApplier<TDocument> | undefined;
}

export class ModelChangeApplierRegistry<TDocument = unknown> {
    private readonly appliers = new Map<
        ModelChangeTargetKind,
        RegisteredModelChangeApplier<TDocument>
    >();

    public registerElement<TRef extends ModelRef, TValue>(
        targetKind: ModelChangeTargetKind,
        applier: ModelElementChangeApplier<TDocument, TRef, TValue>,
    ): void {
        const current = this.appliers.get(targetKind);

        this.appliers.set(targetKind, {
            element: applier,
            property: current?.property,
        });
    }

    public registerProperty<TRef extends ModelRef, TValue>(
        targetKind: ModelChangeTargetKind,
        applier: ModelPropertyChangeApplier<TDocument, TRef, TValue>,
    ): void {
        const current = this.appliers.get(targetKind);

        this.appliers.set(targetKind, {
            element: current?.element,
            property: applier,
        });
    }

    public apply(document: TDocument, changeSet: SerializableModelChangeSet): TDocument {
        let nextDocument = document;

        for (const change of changeSet.changes) {
            nextDocument = this.applyChange(nextDocument, change);
        }

        return nextDocument;
    }

    public revert(document: TDocument, changeSet: SerializableModelChangeSet): TDocument {
        let nextDocument = document;

        for (const change of Array.from(changeSet.changes).reverse()) {
            nextDocument = this.revertChange(nextDocument, change);
        }

        return nextDocument;
    }

    private applyChange(document: TDocument, change: SerializableModelChange): TDocument {
        if (change.kind === 'add') {
            return this.requireElementApplier(change.targetKind).add(
                document,
                change.ref,
                change.value,
            );
        }

        if (change.kind === 'remove') {
            return this.requireElementApplier(change.targetKind).remove(document, change.ref);
        }

        return change.properties.reduce(
            (nextDocument, property) =>
                this.requirePropertyApplier(change.targetKind).set(
                    nextDocument,
                    change.ref,
                    property.propertyPath,
                    property.after,
                ),
            document,
        );
    }

    private revertChange(document: TDocument, change: SerializableModelChange): TDocument {
        if (change.kind === 'add') {
            return this.requireElementApplier(change.targetKind).remove(document, change.ref);
        }

        if (change.kind === 'remove') {
            return this.requireElementApplier(change.targetKind).add(
                document,
                change.ref,
                change.value,
            );
        }

        return Array.from(change.properties)
            .reverse()
            .reduce(
                (nextDocument, property) =>
                    this.requirePropertyApplier(change.targetKind).set(
                        nextDocument,
                        change.ref,
                        property.propertyPath,
                        property.before,
                    ),
                document,
            );
    }

    private requireElementApplier(
        targetKind: ModelChangeTargetKind,
    ): ModelElementChangeApplier<TDocument> {
        const applier = this.appliers.get(targetKind)?.element;

        if (!applier) {
            throw new Error(`No model element change applier registered for ${targetKind}.`);
        }

        return applier;
    }

    private requirePropertyApplier(
        targetKind: ModelChangeTargetKind,
    ): ModelPropertyChangeApplier<TDocument> {
        const applier = this.appliers.get(targetKind)?.property;

        if (!applier) {
            throw new Error(`No model property change applier registered for ${targetKind}.`);
        }

        return applier;
    }
}
