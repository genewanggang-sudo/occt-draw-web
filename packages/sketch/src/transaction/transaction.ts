import type { Sketch } from '../model/sketch';
import type { SketchRequest } from '../request/requests';
import {
    SketchChangeRecorder,
    type SketchChangeSet,
    withActiveSketchChangeRecorder,
} from '../changes/changeTracking';

export class SketchTransaction {
    public readonly label: string;
    public readonly request: SketchRequest;
    private changeSetValue: SketchChangeSet | null = null;

    constructor(input: { readonly label: string; readonly request: SketchRequest }) {
        this.label = input.label;
        this.request = input.request;
    }

    public get changeSet(): SketchChangeSet {
        if (!this.changeSetValue) {
            throw new Error('Sketch transaction has not been committed.');
        }

        return this.changeSetValue;
    }

    public apply(sketch: Sketch): void {
        this.changeSet.apply(sketch);
    }

    public commit(sketch: Sketch): SketchChangeSet {
        const recorder = new SketchChangeRecorder(this.label);

        withActiveSketchChangeRecorder(recorder, () => {
            this.request.apply(sketch);
            sketch.state.incrementRevision();
        });
        this.changeSetValue = recorder.toChangeSet();

        return this.changeSetValue;
    }

    public revert(sketch: Sketch): void {
        this.changeSet.revert(sketch);
    }
}

export class HistoryManager<TTarget extends object> {
    private readonly redoStack: SketchTransaction[] = [];
    private readonly undoStack: SketchTransaction[] = [];

    public clearRedo(): void {
        this.redoStack.length = 0;
    }

    public push(transaction: SketchTransaction): void {
        this.undoStack.push(transaction);
        this.clearRedo();
    }

    public redo(target: TTarget): TTarget {
        const transaction = this.redoStack.pop();

        if (!transaction) {
            return target;
        }

        if (isSketchTarget(target)) {
            transaction.apply(target);
        }
        this.undoStack.push(transaction);

        return target;
    }

    public undo(target: TTarget): TTarget {
        const transaction = this.undoStack.pop();

        if (!transaction) {
            return target;
        }

        if (isSketchTarget(target)) {
            transaction.revert(target);
        }
        this.redoStack.push(transaction);

        return target;
    }
}

function isSketchTarget(target: object): target is Sketch {
    return 'entities' in target && 'state' in target;
}
