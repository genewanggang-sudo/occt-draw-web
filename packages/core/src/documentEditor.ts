export type OperationId = string;
export type DocumentEdit<TDocument = unknown> =
    | DocumentTransaction<TDocument>
    | TransactionGroup<TDocument>;

export abstract class DocumentOperation<TDocument = unknown> {
    public abstract readonly id: OperationId;
    public abstract readonly label: string;
    public abstract apply(document: TDocument): TDocument;
}

export class DocumentTransaction<TDocument = unknown> {
    public readonly label: string;
    public readonly operations: readonly DocumentOperation<TDocument>[];

    constructor(input: {
        readonly label: string;
        readonly operations: readonly DocumentOperation<TDocument>[];
    }) {
        this.label = input.label;
        this.operations = [...input.operations];
    }

    public apply(document: TDocument): TDocument {
        return this.operations.reduce(
            (currentDocument, operation) => operation.apply(currentDocument),
            document,
        );
    }
}

export class TransactionGroup<TDocument = unknown> {
    public readonly label: string;
    public readonly transactions: readonly DocumentTransaction<TDocument>[];

    constructor(input: {
        readonly label: string;
        readonly transactions: readonly DocumentTransaction<TDocument>[];
    }) {
        this.label = input.label;
        this.transactions = [...input.transactions];
    }

    public apply(document: TDocument): TDocument {
        return this.transactions.reduce(
            (currentDocument, transaction) => transaction.apply(currentDocument),
            document,
        );
    }
}

export class DocumentEditor<TDocument = unknown> {
    private readonly document: TDocument;

    constructor(document: TDocument) {
        this.document = document;
    }

    public apply(edit: DocumentEdit<TDocument>): TDocument {
        return edit.apply(this.document);
    }
}

export function editDocument<TDocument>(
    document: TDocument,
    edit: DocumentEdit<TDocument>,
): TDocument {
    return new DocumentEditor(document).apply(edit);
}

export function createOperationId(prefix: string, entityId: string): OperationId {
    return `${prefix}:${entityId}`;
}
