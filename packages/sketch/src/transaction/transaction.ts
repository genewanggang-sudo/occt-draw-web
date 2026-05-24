import { createOperationId, type Operation, type OperationId } from '@occt-draw/core';
import {
    SketchChangeRecorder,
    type SketchChangeSet,
    withActiveSketchChangeRecorder,
} from '../changes/changeTracking';
import type { Sketch } from '../model/sketch';
import type { SketchRequest } from '../request/requests';

export class SketchChangeOperation implements Operation<Sketch> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly request: SketchRequest;
    private changeSetValue: SketchChangeSet | null = null;

    constructor(input: {
        readonly id?: OperationId | undefined;
        readonly label: string;
        readonly request: SketchRequest;
    }) {
        this.id = input.id ?? createOperationId('sketch-request', input.request.kind);
        this.label = input.label;
        this.request = input.request;
    }

    public get changeSet(): SketchChangeSet {
        if (!this.changeSetValue) {
            throw new Error('Sketch operation has not been applied.');
        }

        return this.changeSetValue;
    }

    public apply(sketch: Sketch): Sketch {
        if (this.changeSetValue) {
            this.changeSetValue.apply(sketch);
            return sketch;
        }

        const recorder = new SketchChangeRecorder(this.label);

        withActiveSketchChangeRecorder(recorder, () => {
            this.request.apply(sketch);
            sketch.state.incrementRevision();
        });
        this.changeSetValue = recorder.toChangeSet();

        return sketch;
    }

    public revert(sketch: Sketch): Sketch {
        this.changeSet.revert(sketch);

        return sketch;
    }
}
