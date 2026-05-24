import type { Operation } from './operation';
import { MapOperation } from './operation';
import { Transaction, type TransactionId, type TransactionMergeKey } from './transaction';

class RecordingContext<TRecorder = unknown> {
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
    private readonly operations: Operation<TDocument>[] = [];
    private readonly recordingContext = new RecordingContext<ChangeRecorder<TDocument>>();

    public get count(): number {
        return this.operations.length;
    }

    public isEmpty(): boolean {
        return this.operations.length === 0;
    }

    public record(operation: Operation<TDocument>): void {
        if (this.recordingContext.isSuppressed) {
            return;
        }

        this.operations.push(operation);
    }

    public capture<TResult>(action: () => TResult): TResult {
        return this.recordingContext.withActive(this, action);
    }

    public suppress<TResult>(action: () => TResult): TResult {
        return this.recordingContext.suppress(action);
    }

    public recordMapped<TInner>(input: {
        readonly get: (document: TDocument) => TInner;
        readonly operation: Operation<TInner>;
        readonly replace: (document: TDocument, inner: TInner) => TDocument;
    }): void {
        this.record(
            new MapOperation({
                get: input.get,
                operation: input.operation,
                replace: input.replace,
            }),
        );
    }

    public toTransaction(input: {
        readonly id: TransactionId;
        readonly label: string;
        readonly mergeKey?: TransactionMergeKey | null;
    }): Transaction<TDocument> {
        return new Transaction({
            id: input.id,
            label: input.label,
            mergeKey: input.mergeKey ?? null,
            operations: this.operations,
        });
    }
}
