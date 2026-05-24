import type { Operation } from './operation';
import { MapOperation } from './operation';
import { getNextModelRevision } from '../model/base';

export type TransactionId = string;
export type TransactionMergeKey = string;

export class Transaction<TDocument = unknown> {
    public readonly id: TransactionId;
    public readonly label: string;
    public readonly mergeKey: TransactionMergeKey | null;
    public readonly operations: readonly Operation<TDocument>[];
    private readonly appliedDocumentRevision: number | null;
    private lastAppliedDocumentRevision: number | null = null;
    private readonly previousDocumentRevision: number | null;
    private readonly revisionStack: number[] = [];

    constructor(input: {
        readonly appliedDocumentRevision?: number | null;
        readonly id: TransactionId;
        readonly label: string;
        readonly mergeKey?: TransactionMergeKey | null;
        readonly operations: readonly Operation<TDocument>[];
        readonly previousDocumentRevision?: number | null;
    }) {
        this.appliedDocumentRevision = input.appliedDocumentRevision ?? null;
        this.id = input.id;
        this.label = input.label;
        this.mergeKey = input.mergeKey ?? null;
        this.operations = [...input.operations];
        this.previousDocumentRevision = input.previousDocumentRevision ?? null;
    }

    public apply(document: TDocument): TDocument {
        const previousRevision = readDocumentRevision(document);
        const nextDocument = this.operations.reduce(
            (currentDocument, operation) => operation.apply(currentDocument),
            document,
        );

        if (previousRevision !== null) {
            this.revisionStack.push(previousRevision);
        }

        const appliedRevision = this.resolveAppliedRevision(previousRevision);

        if (appliedRevision !== null) {
            this.lastAppliedDocumentRevision = appliedRevision;
        }

        return this.isEmpty() ? nextDocument : setDocumentRevision(nextDocument, appliedRevision);
    }

    public revert(document: TDocument): TDocument {
        const nextDocument = [...this.operations]
            .reverse()
            .reduce((currentDocument, operation) => operation.revert(currentDocument), document);

        return restoreDocumentRevision(
            nextDocument,
            this.previousDocumentRevision ?? this.revisionStack.pop() ?? null,
        );
    }

    public isEmpty(): boolean {
        return this.operations.length === 0;
    }

    public map<TOuter>(input: {
        readonly get: (outer: TOuter) => TDocument;
        readonly id?: TransactionId | undefined;
        readonly label?: string | undefined;
        readonly replace: (outer: TOuter, inner: TDocument) => TOuter;
    }): Transaction<TOuter> {
        return new Transaction({
            id: input.id ?? this.id,
            label: input.label ?? this.label,
            mergeKey: this.mergeKey,
            operations: this.operations.map(
                (operation) =>
                    new MapOperation({
                        get: input.get,
                        operation,
                        replace: input.replace,
                    }),
            ),
            appliedDocumentRevision: this.appliedDocumentRevision,
            previousDocumentRevision: this.previousDocumentRevision,
        });
    }

    public canMergeWith(transaction: Transaction<TDocument>): boolean {
        return this.mergeKey !== null && this.mergeKey === transaction.mergeKey;
    }

    public mergeWith(
        transaction: Transaction<TDocument>,
        input?: { readonly id?: TransactionId; readonly label?: string },
    ): Transaction<TDocument> {
        if (!this.canMergeWith(transaction)) {
            throw new Error(
                `Cannot merge transactions ${this.id} and ${transaction.id}: merge keys differ.`,
            );
        }

        return new Transaction({
            id: input?.id ?? `${this.id}+${transaction.id}`,
            label: input?.label ?? transaction.label,
            mergeKey: this.mergeKey,
            operations: [...this.operations, ...transaction.operations],
            appliedDocumentRevision: this.resolveMergedAppliedRevision(transaction),
            previousDocumentRevision:
                this.previousDocumentRevision ?? transaction.previousDocumentRevision,
        });
    }

    private resolveAppliedRevision(previousRevision: number | null): number | null {
        if (this.appliedDocumentRevision !== null) {
            return this.appliedDocumentRevision;
        }

        return previousRevision === null ? null : getNextModelRevision(previousRevision);
    }

    private resolveMergedAppliedRevision(transaction: Transaction<TDocument>): number | null {
        return (
            transaction.appliedDocumentRevision ??
            transaction.lastAppliedDocumentRevision ??
            this.appliedDocumentRevision ??
            this.lastAppliedDocumentRevision
        );
    }
}

export function createTransactionId(prefix: string, entityId: string): TransactionId {
    return `${prefix}:${entityId}`;
}

function readDocumentRevision(document: unknown): number | null {
    return isRevisionedDocument(document) ? document.revision : null;
}

function setDocumentRevision<TDocument>(document: TDocument, revision: number | null): TDocument {
    if (revision !== null && isRevisionedDocument(document)) {
        document.withRevision(revision);
    }

    return document;
}

function restoreDocumentRevision<TDocument>(
    document: TDocument,
    revision: number | null,
): TDocument {
    if (revision !== null && isRevisionedDocument(document)) {
        document.withRevision(revision);
    }

    return document;
}

function isRevisionedDocument(document: unknown): document is {
    readonly revision: number;
    withRevision(revision: number): unknown;
} {
    return (
        typeof document === 'object' &&
        document !== null &&
        'revision' in document &&
        'withRevision' in document &&
        typeof document.withRevision === 'function'
    );
}
