import { createOperationId, type Operation, type OperationId } from '@occt-draw/core';
import { SketchChangeRecorder, withActiveSketchChangeRecorder } from '../changes/changeTracking';
import type { Sketch } from '../model/sketch';
import type { SketchRequest } from '../request/requests';

export class SketchChangeOperation implements Operation<Sketch> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly request: SketchRequest;
    private transactionValue: Operation<Sketch> | null = null;

    constructor(input: {
        readonly id?: OperationId | undefined;
        readonly label: string;
        readonly request: SketchRequest;
    }) {
        this.id = input.id ?? createOperationId('sketch-request', input.request.kind);
        this.label = input.label;
        this.request = input.request;
    }

    public get transaction(): Operation<Sketch> {
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
            this.request.apply(sketch);
            sketch.state.incrementRevision();
        });
        this.transactionValue = recorder.toTransaction({ id: this.id });

        return sketch;
    }

    public revert(sketch: Sketch): Sketch {
        return this.transaction.revert(sketch);
    }
}
