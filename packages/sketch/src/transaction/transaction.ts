import type { ModelChangeId, Transaction } from '@occt-draw/core';
import { SketchChangeRecorder, withActiveSketchChangeRecorder } from '../changes/changeTracking';
import type { Sketch } from '../model/sketch';
import type { SketchEdit } from '../request/requests';

export function createSketchEditTransaction<TEdit extends SketchEdit, TResult>(input: {
    readonly edit: TEdit;
    readonly id: ModelChangeId;
    readonly label: string;
    readonly readResult: (edit: TEdit) => TResult;
    readonly sketch: Sketch;
}): {
    readonly result: TResult;
    readonly transaction: Transaction<Sketch>;
} {
    const recorder = new SketchChangeRecorder(input.label);

    withActiveSketchChangeRecorder(recorder, () => {
        input.edit.apply(input.sketch.clone());
    });

    return {
        result: input.readResult(input.edit),
        transaction: recorder.toTransaction({ id: input.id }),
    };
}
