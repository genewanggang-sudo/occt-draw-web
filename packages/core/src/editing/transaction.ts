import type { ModelChangeSet, SerializableModelChangeSet } from './changeSet';
import { getNextModelRevision } from '../model/base';

export type TransactionId = string;
export type TransactionMergeKey = string;

export interface SerializableTransaction {
    readonly changeSet: SerializableModelChangeSet;
    readonly id: TransactionId;
    readonly label: string;
    readonly mergeKey: TransactionMergeKey | null;
}

/**
 * Change result produced by a Request.
 *
 * Transaction still owns runtime apply/revert behavior for the current editor,
 * while snapshot()/toSerializable() exposes the data patch shape that can later
 * be persisted, sent to workers, or interpreted through an applier registry.
 */
export class Transaction<TDocument = unknown> {
    public readonly id: TransactionId;
    public readonly label: string;
    public readonly mergeKey: TransactionMergeKey | null;
    public readonly changeSet: ModelChangeSet<TDocument>;
    private readonly revisionPolicy: TransactionRevisionPolicy;
    private lastAppliedDocumentRevision: number | null = null;
    private readonly revisionStack: number[] = [];

    constructor(input: {
        readonly appliedDocumentRevision?: number | null;
        readonly changeSet: ModelChangeSet<TDocument>;
        readonly id: TransactionId;
        readonly label: string;
        readonly mergeKey?: TransactionMergeKey | null;
        readonly previousDocumentRevision?: number | null;
    }) {
        this.revisionPolicy = new TransactionRevisionPolicy({
            appliedDocumentRevision: input.appliedDocumentRevision ?? null,
            previousDocumentRevision: input.previousDocumentRevision ?? null,
        });
        this.id = input.id;
        this.label = input.label;
        this.mergeKey = input.mergeKey ?? null;
        this.changeSet = input.changeSet;
    }

    public apply(document: TDocument): TDocument {
        const previousRevision = readDocumentRevision(document);
        const nextDocument = this.applyOperations(document);

        if (previousRevision !== null) {
            this.revisionStack.push(previousRevision);
        }

        const appliedRevision = this.revisionPolicy.resolveAppliedRevision(previousRevision);

        if (appliedRevision !== null) {
            this.lastAppliedDocumentRevision = appliedRevision;
        }

        return this.isEmpty() ? nextDocument : setDocumentRevision(nextDocument, appliedRevision);
    }

    public revert(document: TDocument): TDocument {
        const nextDocument = this.revertOperations(document);

        return restoreDocumentRevision(
            nextDocument,
            this.revisionPolicy.resolvePreviousRevision(this.revisionStack.pop() ?? null),
        );
    }

    public isEmpty(): boolean {
        return this.changeSet.isEmpty();
    }

    public snapshot(): SerializableTransaction {
        return {
            changeSet: this.changeSet.snapshot(),
            id: this.id,
            label: this.label,
            mergeKey: this.mergeKey,
        };
    }

    public toSerializable(): SerializableTransaction {
        return this.snapshot();
    }

    public map<TOuter>(input: {
        readonly get: (outer: TOuter) => TDocument;
        readonly id?: TransactionId | undefined;
        readonly label?: string | undefined;
        readonly replace: (outer: TOuter, inner: TDocument) => TOuter;
    }): Transaction<TOuter> {
        return new Transaction({
            changeSet: this.changeSet.map({
                get: input.get,
                replace: input.replace,
            }),
            id: input.id ?? this.id,
            label: input.label ?? this.label,
            mergeKey: this.mergeKey,
            appliedDocumentRevision: this.revisionPolicy.appliedDocumentRevision,
            previousDocumentRevision: this.revisionPolicy.previousDocumentRevision,
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
            changeSet: this.changeSet.mergeWith(transaction.changeSet),
            id: input?.id ?? `${this.id}+${transaction.id}`,
            label: input?.label ?? transaction.label,
            mergeKey: this.mergeKey,
            appliedDocumentRevision: this.resolveMergedAppliedRevision(transaction),
            previousDocumentRevision:
                this.revisionPolicy.previousDocumentRevision ??
                transaction.revisionPolicy.previousDocumentRevision,
        });
    }

    private applyOperations(document: TDocument): TDocument {
        return this.changeSet.apply(document);
    }

    private revertOperations(document: TDocument): TDocument {
        return this.changeSet.revert(document);
    }

    private resolveMergedAppliedRevision(transaction: Transaction<TDocument>): number | null {
        return (
            transaction.revisionPolicy.appliedDocumentRevision ??
            transaction.lastAppliedDocumentRevision ??
            this.revisionPolicy.appliedDocumentRevision ??
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

class TransactionRevisionPolicy {
    public readonly appliedDocumentRevision: number | null;
    public readonly previousDocumentRevision: number | null;

    constructor(input: {
        readonly appliedDocumentRevision: number | null;
        readonly previousDocumentRevision: number | null;
    }) {
        this.appliedDocumentRevision = input.appliedDocumentRevision;
        this.previousDocumentRevision = input.previousDocumentRevision;
    }

    public resolveAppliedRevision(previousRevision: number | null): number | null {
        if (this.appliedDocumentRevision !== null) {
            return this.appliedDocumentRevision;
        }

        return previousRevision === null ? null : getNextModelRevision(previousRevision);
    }

    public resolvePreviousRevision(runtimePreviousRevision: number | null): number | null {
        return this.previousDocumentRevision ?? runtimePreviousRevision;
    }
}
