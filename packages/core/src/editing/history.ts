import type { Transaction } from './transaction';

export interface HistoryRecordLabels {
    readonly record?: string | undefined;
    readonly redoLabel?: string | undefined;
    readonly undoLabel?: string | undefined;
}

export class HistoryRecord<TDocument = unknown> {
    public readonly record: string;
    public readonly redoLabel: string;
    public readonly transaction: Transaction<TDocument>;
    public readonly undoLabel: string;

    constructor(input: {
        readonly record?: string | undefined;
        readonly redoLabel?: string | undefined;
        readonly transaction: Transaction<TDocument>;
        readonly undoLabel?: string | undefined;
    }) {
        this.record = input.record ?? input.transaction.label;
        this.redoLabel = input.redoLabel ?? `Redo ${this.record}`;
        this.transaction = input.transaction;
        this.undoLabel = input.undoLabel ?? `Undo ${this.record}`;
    }

    public get id(): string {
        return this.transaction.id;
    }

    public get label(): string {
        return this.record;
    }

    public apply(document: TDocument): TDocument {
        return this.transaction.apply(document);
    }

    public canMergeWith(record: HistoryRecord<TDocument>): boolean {
        return this.transaction.canMergeWith(record.transaction);
    }

    public isEmpty(): boolean {
        return this.transaction.isEmpty();
    }

    public mergeWith(
        record: HistoryRecord<TDocument>,
        labels: HistoryRecordLabels = {},
    ): HistoryRecord<TDocument> {
        return new HistoryRecord({
            record: labels.record ?? record.record,
            redoLabel: labels.redoLabel ?? record.redoLabel,
            transaction: this.transaction.mergeWith(record.transaction, {
                label: labels.record ?? record.record,
            }),
            undoLabel: labels.undoLabel ?? record.undoLabel,
        });
    }

    public revert(document: TDocument): TDocument {
        return this.transaction.revert(document);
    }
}

export interface HistoryMoveResult<TDocument = unknown> {
    readonly document: TDocument;
    readonly record: HistoryRecord<TDocument> | null;
    readonly transaction: Transaction<TDocument> | null;
}

export class History<TDocument = unknown> {
    private readonly redoStack: HistoryRecord<TDocument>[];
    private readonly undoStack: HistoryRecord<TDocument>[];

    constructor(
        input: {
            readonly redoStack?: readonly HistoryRecord<TDocument>[];
            readonly undoStack?: readonly HistoryRecord<TDocument>[];
        } = {},
    ) {
        this.redoStack = [...(input.redoStack ?? [])];
        this.undoStack = [...(input.undoStack ?? [])];
    }

    public get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public get redoDepth(): number {
        return this.redoStack.length;
    }

    public get redoLabel(): string | null {
        return this.peekRedo()?.redoLabel ?? null;
    }

    public get undoDepth(): number {
        return this.undoStack.length;
    }

    public get undoLabel(): string | null {
        return this.peekUndo()?.undoLabel ?? null;
    }

    public clear(): void {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
    }

    public clone(): History<TDocument> {
        return new History({
            redoStack: this.redoStack,
            undoStack: this.undoStack,
        });
    }

    public clearRedo(): void {
        this.redoStack.length = 0;
    }

    public peekRedo(): HistoryRecord<TDocument> | null {
        return this.redoStack.at(-1) ?? null;
    }

    public peekUndo(): HistoryRecord<TDocument> | null {
        return this.undoStack.at(-1) ?? null;
    }

    public push(record: HistoryRecord<TDocument> | Transaction<TDocument>): boolean {
        return this.record(record);
    }

    public record(record: HistoryRecord<TDocument> | Transaction<TDocument>): boolean {
        const historyRecord = this.normalizeRecord(record);

        if (historyRecord.isEmpty()) {
            return false;
        }

        const previous = this.undoStack.at(-1);

        if (previous?.canMergeWith(historyRecord)) {
            this.undoStack[this.undoStack.length - 1] = previous.mergeWith(historyRecord);
        } else {
            this.undoStack.push(historyRecord);
        }
        this.clearRedo();

        return true;
    }

    public redo(document: TDocument): HistoryMoveResult<TDocument> {
        const transaction = this.redoStack.pop();

        if (!transaction) {
            return { document, record: null, transaction: null };
        }

        const nextDocument = transaction.apply(document);

        this.undoStack.push(transaction);

        return {
            document: nextDocument,
            record: transaction,
            transaction: transaction.transaction,
        };
    }

    public undo(document: TDocument): HistoryMoveResult<TDocument> {
        const transaction = this.undoStack.pop();

        if (!transaction) {
            return { document, record: null, transaction: null };
        }

        const nextDocument = transaction.revert(document);

        this.redoStack.push(transaction);

        return {
            document: nextDocument,
            record: transaction,
            transaction: transaction.transaction,
        };
    }

    private normalizeRecord(
        record: HistoryRecord<TDocument> | Transaction<TDocument>,
    ): HistoryRecord<TDocument> {
        if (record instanceof HistoryRecord) {
            return record;
        }

        return new HistoryRecord({ transaction: record });
    }
}
