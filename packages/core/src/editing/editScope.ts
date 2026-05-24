import { HistoryRecord, type HistoryLabels } from './history';
import type { Transaction, TransactionId } from './transaction';
import { createTransactionId, Transaction as CoreTransaction } from './transaction';

export type EditScopeId = string;

export interface EditScopeMoveResult<TDocument = unknown> {
    readonly document: TDocument;
    readonly record: HistoryRecord<TDocument> | null;
    readonly transaction: Transaction<TDocument> | null;
}

export class EditScope<TDocument = unknown> {
    public readonly id: EditScopeId;
    public readonly label: string;
    private closed: boolean;
    private initialDocumentRevision: number | null;
    private currentDocumentRevision: number | null;
    private readonly redoStack: HistoryRecord<TDocument>[];
    private readonly records: HistoryRecord<TDocument>[];

    constructor(input: {
        readonly closed?: boolean;
        readonly currentDocumentRevision?: number | null;
        readonly id: EditScopeId;
        readonly initialDocumentRevision?: number | null;
        readonly label: string;
        readonly records?: readonly HistoryRecord<TDocument>[];
        readonly redoStack?: readonly HistoryRecord<TDocument>[];
    }) {
        this.closed = input.closed ?? false;
        this.currentDocumentRevision = input.currentDocumentRevision ?? null;
        this.id = input.id;
        this.initialDocumentRevision = input.initialDocumentRevision ?? null;
        this.label = input.label;
        this.records = [...(input.records ?? [])];
        this.redoStack = [...(input.redoStack ?? [])];
    }

    public get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public get canUndo(): boolean {
        return this.records.length > 0;
    }

    public get isClosed(): boolean {
        return this.closed;
    }

    public get redoDepth(): number {
        return this.redoStack.length;
    }

    public get redoLabel(): string | null {
        return this.peekRedo()?.redoLabel ?? null;
    }

    public get transactionDepth(): number {
        return this.records.length;
    }

    public get undoLabel(): string | null {
        return this.peekUndo()?.undoLabel ?? null;
    }

    public cancel(document: TDocument): EditScopeMoveResult<TDocument> {
        this.ensureOpen();

        const transaction = this.createCombinedTransaction({
            id: createTransactionId('cancel-edit-scope', this.id),
            label: this.label,
        });
        const nextDocument = transaction.revert(document);

        this.records.length = 0;
        this.redoStack.length = 0;
        this.closed = true;
        const record = transaction.isEmpty() ? null : new HistoryRecord({ transaction });

        return {
            document: nextDocument,
            record,
            transaction: transaction.isEmpty() ? null : transaction,
        };
    }

    public confirm(
        input: {
            readonly id?: TransactionId | undefined;
            readonly label?: string | undefined;
        } = {},
    ): Transaction<TDocument> {
        this.ensureOpen();
        this.closed = true;

        return this.createCombinedTransaction({
            id: input.id ?? createTransactionId('confirm-edit-scope', this.id),
            label: input.label ?? this.label,
        });
    }

    public isEmpty(): boolean {
        return this.records.every((record) => record.isEmpty());
    }

    public clone(): EditScope<TDocument> {
        return new EditScope({
            closed: this.closed,
            currentDocumentRevision: this.currentDocumentRevision,
            id: this.id,
            initialDocumentRevision: this.initialDocumentRevision,
            label: this.label,
            records: this.records,
            redoStack: this.redoStack,
        });
    }

    public peekRedo(): HistoryRecord<TDocument> | null {
        return this.redoStack.at(-1) ?? null;
    }

    public peekUndo(): HistoryRecord<TDocument> | null {
        return this.records.at(-1) ?? null;
    }

    public push(
        transaction: Transaction<TDocument>,
        document: TDocument,
        history?: HistoryLabels | null,
    ): EditScopeMoveResult<TDocument> {
        this.ensureOpen();

        if (transaction.isEmpty()) {
            return { document, record: null, transaction: null };
        }

        this.initialDocumentRevision ??= readDocumentRevision(document);
        const record = new HistoryRecord({
            label: history?.label,
            redoLabel: history?.redoLabel,
            transaction,
            undoLabel: history?.undoLabel,
        });
        const nextDocument = record.apply(document);
        this.currentDocumentRevision = readDocumentRevision(nextDocument);
        const previous = this.records.at(-1);

        if (previous?.canMergeWith(record)) {
            this.records[this.records.length - 1] = previous.mergeWith(record);
        } else {
            this.records.push(record);
        }
        this.redoStack.length = 0;

        return { document: nextDocument, record, transaction };
    }

    public redo(document: TDocument): EditScopeMoveResult<TDocument> {
        this.ensureOpen();

        const record = this.redoStack.pop();

        if (!record) {
            return { document, record: null, transaction: null };
        }

        const nextDocument = record.apply(document);
        this.currentDocumentRevision = readDocumentRevision(nextDocument);

        this.records.push(record);

        return { document: nextDocument, record, transaction: record.transaction };
    }

    public undo(document: TDocument): EditScopeMoveResult<TDocument> {
        this.ensureOpen();

        const record = this.records.pop();

        if (!record) {
            return { document, record: null, transaction: null };
        }

        const nextDocument = record.revert(document);
        this.currentDocumentRevision = readDocumentRevision(nextDocument);

        this.redoStack.push(record);

        return { document: nextDocument, record, transaction: record.transaction };
    }

    private createCombinedTransaction(input: {
        readonly id: TransactionId;
        readonly label: string;
    }): Transaction<TDocument> {
        return new CoreTransaction({
            appliedDocumentRevision: this.currentDocumentRevision,
            id: input.id,
            label: input.label,
            operations: this.records.flatMap((record) => record.transaction.operations),
            previousDocumentRevision: this.initialDocumentRevision,
        });
    }

    private ensureOpen(): void {
        if (this.closed) {
            throw new Error(`Edit scope ${this.id} is already closed.`);
        }
    }
}

function readDocumentRevision(document: unknown): number | null {
    return typeof document === 'object' &&
        document !== null &&
        'revision' in document &&
        typeof document.revision === 'number'
        ? document.revision
        : null;
}
