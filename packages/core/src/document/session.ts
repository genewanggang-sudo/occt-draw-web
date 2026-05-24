import type { EditScope } from '../editing/editScope';
import type { History, HistoryLabels, HistoryRecord } from '../editing/history';
import type { Request, RequestExecution } from '../editing/request';
import { RequestExecutor } from '../editing/requestExecutor';
import type { Transaction } from '../editing/transaction';

export interface DocumentSessionChange<TDocument = unknown> {
    readonly document: TDocument;
    readonly record: HistoryRecord<TDocument> | null;
    readonly transaction: Transaction<TDocument> | null;
}

export interface DocumentSessionRequestResult<TDocument = unknown, TResult = void> {
    readonly document: TDocument;
    readonly execution: RequestExecution<TDocument, TResult>;
    readonly recorded: boolean;
}

export interface DocumentSessionScopeCommitResult<TDocument = unknown> {
    readonly record: HistoryRecord<TDocument> | null;
    readonly recorded: boolean;
    readonly transaction: Transaction<TDocument>;
}

export interface DocumentSessionSnapshot<TDocument = unknown> {
    readonly canRedo: boolean;
    readonly canUndo: boolean;
    readonly document: TDocument;
    readonly hasActiveScope: boolean;
    readonly redoDepth: number;
    readonly redoLabel: string | null;
    readonly undoDepth: number;
    readonly undoLabel: string | null;
}

export class DocumentSession<TDocument = unknown> {
    private documentValue: TDocument;
    private executor: RequestExecutor<TDocument>;

    constructor(document: TDocument) {
        this.documentValue = document;
        this.executor = new RequestExecutor<TDocument>();
    }

    public get activeScope(): EditScope<TDocument> | null {
        return this.executor.activeScope;
    }

    public get canRedo(): boolean {
        return this.activeScope?.canRedo ?? this.history.canRedo;
    }

    public get canUndo(): boolean {
        return this.activeScope?.canUndo ?? this.history.canUndo;
    }

    public get document(): TDocument {
        return this.documentValue;
    }

    public get history(): History<TDocument> {
        return this.executor.history;
    }

    public get redoLabel(): string | null {
        return this.activeScope?.redoLabel ?? this.history.redoLabel;
    }

    public get undoLabel(): string | null {
        return this.activeScope?.undoLabel ?? this.history.undoLabel;
    }

    public clone(): DocumentSession<TDocument> {
        const session = new DocumentSession(this.documentValue);

        session.executor = this.executor.clone();

        return session;
    }

    public beginScope(input: {
        readonly id: string;
        readonly label: string;
    }): EditScope<TDocument> {
        return this.executor.beginScope(input);
    }

    public cancelScope(): DocumentSessionChange<TDocument> {
        return this.applyChange(this.executor.cancelScope(this.documentValue));
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & HistoryLabels = {},
    ): DocumentSessionScopeCommitResult<TDocument> {
        return this.executor.confirmScope(input);
    }

    public execute<TResult>(
        request: Request<TDocument, TResult>,
    ): DocumentSessionRequestResult<TDocument, TResult> {
        const result = this.executor.execute(request, this.documentValue);

        this.documentValue = result.document;

        return result;
    }

    public executeRequest<TResult>(
        request: Request<TDocument, TResult>,
    ): RequestExecution<TDocument, TResult> {
        return this.execute(request).execution;
    }

    public getSnapshot(): DocumentSessionSnapshot<TDocument> {
        return {
            canRedo: this.canRedo,
            canUndo: this.canUndo,
            document: this.documentValue,
            hasActiveScope: this.activeScope !== null,
            redoDepth: this.activeScope?.redoDepth ?? this.history.redoDepth,
            redoLabel: this.redoLabel,
            undoDepth: this.activeScope?.transactionDepth ?? this.history.undoDepth,
            undoLabel: this.undoLabel,
        };
    }

    public redo(): DocumentSessionChange<TDocument> {
        return this.applyChange(this.executor.redo(this.documentValue));
    }

    public undo(): DocumentSessionChange<TDocument> {
        return this.applyChange(this.executor.undo(this.documentValue));
    }

    private applyChange(input: DocumentSessionChange<TDocument>): DocumentSessionChange<TDocument> {
        this.documentValue = input.document;

        return input;
    }
}
