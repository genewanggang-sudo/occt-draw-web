import {
    ModelChangeSetBuilder,
    type ModelAddedChange,
    type ModelChangeSet,
    type ModelDeletedChange,
    type ModelUpdatedChange,
} from './changeSet';
import { Transaction, type TransactionId, type TransactionMergeKey } from './transaction';
import type { ModelRef } from '../model/refs';

export class ChangeRecordingScope<TRecorder = unknown> {
    private activeRecorder: TRecorder | null = null;
    private suppressionDepth = 0;

    public get active(): TRecorder | null {
        return this.activeRecorder;
    }

    public get isSuppressed(): boolean {
        return this.suppressionDepth > 0;
    }

    public requireActive(): TRecorder {
        if (!this.activeRecorder) {
            throw new Error('No active change recorder.');
        }

        return this.activeRecorder;
    }

    public suppress<T>(action: () => T): T {
        this.suppressionDepth += 1;
        try {
            return action();
        } finally {
            this.suppressionDepth -= 1;
        }
    }

    public withActive<T>(recorder: TRecorder, action: () => T): T {
        const previousRecorder = this.activeRecorder;

        this.activeRecorder = recorder;
        try {
            return action();
        } finally {
            this.activeRecorder = previousRecorder;
        }
    }
}

export class ChangeRecorder<TDocument = unknown> {
    private readonly builder = new ModelChangeSetBuilder<TDocument>();
    private readonly recordingContext = new ChangeRecordingScope<ChangeRecorder<TDocument>>();

    public get count(): number {
        return this.builder.count;
    }

    public isEmpty(): boolean {
        return this.builder.isEmpty();
    }

    public recordAdd<TRef extends ModelRef, TValue>(
        change: ModelAddedChange<TDocument, TRef, TValue>,
    ): void {
        if (this.recordingContext.isSuppressed) {
            return;
        }

        this.builder.recordAdd(change);
    }

    public recordDelete<TRef extends ModelRef, TValue>(
        change: ModelDeletedChange<TDocument, TRef, TValue>,
    ): void {
        if (this.recordingContext.isSuppressed) {
            return;
        }

        this.builder.recordDelete(change);
    }

    public recordUpdate<TRef extends ModelRef, TValue>(
        change: Omit<ModelUpdatedChange<TDocument, TRef, TValue>, 'properties'> & {
            readonly after: TValue;
            readonly before: TValue;
            readonly propertyPath: readonly string[];
        },
    ): void {
        if (this.recordingContext.isSuppressed) {
            return;
        }

        this.builder.recordUpdate(change);
    }

    public recordChangeSet(changeSet: ModelChangeSet<TDocument>): void {
        if (this.recordingContext.isSuppressed) {
            return;
        }

        this.builder.recordChangeSet(changeSet);
    }

    public capture<TResult>(action: () => TResult): TResult {
        return this.recordingContext.withActive(this, action);
    }

    public suppress<TResult>(action: () => TResult): TResult {
        return this.recordingContext.suppress(action);
    }

    public toChangeSet(): ModelChangeSet<TDocument> {
        return this.builder.toChangeSet();
    }

    public toTransaction(input: {
        readonly id: TransactionId;
        readonly label: string;
        readonly mergeKey?: TransactionMergeKey | null;
    }): Transaction<TDocument> {
        return new Transaction({
            changeSet: this.toChangeSet(),
            id: input.id,
            label: input.label,
            mergeKey: input.mergeKey ?? null,
        });
    }
}
