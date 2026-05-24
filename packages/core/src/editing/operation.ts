export type OperationId = string;

export function createOperationId(prefix: string, entityId: string): OperationId {
    return `${prefix}:${entityId}`;
}

export interface Operation<TDocument = unknown> {
    readonly id: OperationId;
    readonly label: string;
    apply(document: TDocument): TDocument;
    revert(document: TDocument): TDocument;
}

export interface OperationResult<TDocument = unknown> {
    readonly document: TDocument;
}

export class ReplaceStateOperation<TState = unknown> implements Operation<TState> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly nextState: TState;
    public readonly previousState: TState;

    constructor(input: {
        readonly id: OperationId;
        readonly label: string;
        readonly nextState: TState;
        readonly previousState: TState;
    }) {
        this.id = input.id;
        this.label = input.label;
        this.nextState = input.nextState;
        this.previousState = input.previousState;
    }

    public apply(): TState {
        return this.nextState;
    }

    public revert(): TState {
        return this.previousState;
    }
}

export class ReplaceValueOperation<
    TDocument = unknown,
    TValue = unknown,
> implements Operation<TDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly nextValue: TValue;
    public readonly previousValue: TValue;
    private readonly replaceValue: (document: TDocument, value: TValue) => TDocument;

    constructor(input: {
        readonly id: OperationId;
        readonly label: string;
        readonly nextValue: TValue;
        readonly previousValue: TValue;
        readonly replace: (document: TDocument, value: TValue) => TDocument;
    }) {
        this.id = input.id;
        this.label = input.label;
        this.nextValue = input.nextValue;
        this.previousValue = input.previousValue;
        this.replaceValue = input.replace;
    }

    public apply(document: TDocument): TDocument {
        return this.replaceValue(document, this.nextValue);
    }

    public revert(document: TDocument): TDocument {
        return this.replaceValue(document, this.previousValue);
    }
}

export class MapOperation<TOuter = unknown, TInner = unknown> implements Operation<TOuter> {
    public readonly id: OperationId;
    public readonly innerOperation: Operation<TInner>;
    public readonly label: string;
    private readonly getInner: (outer: TOuter) => TInner;
    private readonly replaceInner: (outer: TOuter, inner: TInner) => TOuter;

    constructor(input: {
        readonly get: (outer: TOuter) => TInner;
        readonly id?: OperationId;
        readonly label?: string;
        readonly operation: Operation<TInner>;
        readonly replace: (outer: TOuter, inner: TInner) => TOuter;
    }) {
        this.getInner = input.get;
        this.id = input.id ?? input.operation.id;
        this.innerOperation = input.operation;
        this.label = input.label ?? input.operation.label;
        this.replaceInner = input.replace;
    }

    public apply(outer: TOuter): TOuter {
        return this.replaceInner(outer, this.innerOperation.apply(this.getInner(outer)));
    }

    public revert(outer: TOuter): TOuter {
        return this.replaceInner(outer, this.innerOperation.revert(this.getInner(outer)));
    }
}

export class FunctionalOperation<TDocument = unknown> implements Operation<TDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    private readonly applyDocument: (document: TDocument) => TDocument;
    private readonly revertDocument: (document: TDocument) => TDocument;

    constructor(input: {
        readonly apply: (document: TDocument) => TDocument;
        readonly id: OperationId;
        readonly label: string;
        readonly revert: (document: TDocument) => TDocument;
    }) {
        this.applyDocument = input.apply;
        this.id = input.id;
        this.label = input.label;
        this.revertDocument = input.revert;
    }

    public apply(document: TDocument): TDocument {
        return this.applyDocument(document);
    }

    public revert(document: TDocument): TDocument {
        return this.revertDocument(document);
    }
}
