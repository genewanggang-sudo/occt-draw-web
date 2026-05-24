import type { Operation } from './operation';
import { MapOperation } from './operation';

export type TransactionId = string;
export type TransactionMergeKey = string;

export class Transaction<TDocument = unknown> {
    public readonly id: TransactionId;
    public readonly label: string;
    public readonly mergeKey: TransactionMergeKey | null;
    public readonly operations: readonly Operation<TDocument>[];

    constructor(input: {
        readonly id: TransactionId;
        readonly label: string;
        readonly mergeKey?: TransactionMergeKey | null;
        readonly operations: readonly Operation<TDocument>[];
    }) {
        this.id = input.id;
        this.label = input.label;
        this.mergeKey = input.mergeKey ?? null;
        this.operations = [...input.operations];
    }

    public apply(document: TDocument): TDocument {
        return this.operations.reduce(
            (currentDocument, operation) => operation.apply(currentDocument),
            document,
        );
    }

    public revert(document: TDocument): TDocument {
        return [...this.operations]
            .reverse()
            .reduce((currentDocument, operation) => operation.revert(currentDocument), document);
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
        });
    }
}

export function createTransactionId(prefix: string, entityId: string): TransactionId {
    return `${prefix}:${entityId}`;
}
