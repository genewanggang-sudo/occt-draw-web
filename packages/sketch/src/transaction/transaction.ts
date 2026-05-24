import { Transaction, createOperationId, type Operation, type OperationId } from '@occt-draw/core';
import { SketchChangeRecorder, withActiveSketchChangeRecorder } from '../changes/changeTracking';
import type { Sketch } from '../model/sketch';
import type { SketchEdit } from '../request/requests';

export class SketchChangeOperation implements Operation<Sketch> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly edit: SketchEdit;
    private transactionValue: Transaction<Sketch> | null = null;

    constructor(input: {
        readonly id?: OperationId | undefined;
        readonly label: string;
        readonly edit: SketchEdit;
    }) {
        this.id = input.id ?? createOperationId('sketch-edit', input.edit.kind);
        this.label = input.label;
        this.edit = input.edit;
    }

    public get transaction(): Transaction<Sketch> {
        if (!this.transactionValue) {
            throw new Error('Sketch operation has not been applied.');
        }

        return this.transactionValue;
    }

    public apply(sketch: Sketch): Sketch {
        if (this.transactionValue) {
            return this.transactionValue.apply(sketch);
        }

        const recorder = new SketchChangeRecorder(this.label);

        withActiveSketchChangeRecorder(recorder, () => {
            this.edit.apply(sketch);
        });
        this.transactionValue = recorder.toTransaction({ id: this.id });

        return sketch;
    }

    public revert(sketch: Sketch): Sketch {
        return this.transaction.revert(sketch);
    }
}

export function createSketchEditTransaction<TEdit extends SketchEdit, TResult>(input: {
    readonly edit: TEdit;
    readonly id: OperationId;
    readonly label: string;
    readonly readResult: (edit: TEdit) => TResult;
    readonly sketch: Sketch;
}): {
    readonly result: TResult;
    readonly transaction: Transaction<Sketch>;
} {
    const operation = new SketchChangeOperation({
        edit: input.edit,
        id: input.id,
        label: input.label,
    });

    operation.apply(input.sketch.clone());

    return {
        result: input.readResult(input.edit),
        transaction: new Transaction({
            id: operation.transaction.id,
            label: operation.transaction.label,
            operations: operation.transaction.operations,
        }),
    };
}
