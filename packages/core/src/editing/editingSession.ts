import type { EditScope } from './editScope';
import type { History, HistoryRecord, HistoryRecordLabels } from './history';
import type { Request, RequestExecution } from './request';
import {
    RequestExecutor,
    type RequestExecutorResult,
    type ScopeCommitResult,
} from './requestExecutor';
import type { Transaction } from './transaction';

export interface EditingSessionChange<TDocument = unknown> {
    readonly document: TDocument;
    readonly record: HistoryRecord<TDocument> | null;
    readonly transaction: Transaction<TDocument> | null;
}

export type EditingSessionRequestResult<
    TDocument = unknown,
    TResult = void,
> = RequestExecutorResult<TDocument, TResult>;

export interface EditingSessionSnapshot<TDocument = unknown> {
    readonly activeScope: EditScope<TDocument> | null;
    readonly canRedo: boolean;
    readonly canUndo: boolean;
    readonly document: TDocument;
    readonly redoDepth: number;
    readonly redoLabel: string | null;
    readonly undoDepth: number;
    readonly undoLabel: string | null;
}

export class EditingSession<TDocument = unknown> {
    private documentValue: TDocument;
    private readonly executor: RequestExecutor<TDocument>;

    constructor(input: {
        readonly document: TDocument;
        readonly executor?: RequestExecutor<TDocument>;
    }) {
        this.documentValue = input.document;
        this.executor = input.executor ?? new RequestExecutor<TDocument>();
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

    public clone(): EditingSession<TDocument> {
        return new EditingSession({
            document: this.documentValue,
            executor: this.executor.clone(),
        });
    }

    public beginScope(input: {
        readonly id: string;
        readonly label: string;
    }): EditScope<TDocument> {
        return this.executor.beginScope(input);
    }

    public cancelScope(): EditingSessionChange<TDocument> {
        const result = this.executor.cancelScope(this.documentValue);

        this.documentValue = result.document;

        return result;
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & HistoryRecordLabels = {},
    ): ScopeCommitResult<TDocument> {
        return this.executor.confirmScope(input);
    }

    public execute<TResult>(
        request: Request<TDocument, TResult>,
    ): EditingSessionRequestResult<TDocument, TResult> {
        const result = this.executor.execute(request, this.documentValue);

        this.documentValue = result.document;

        return result;
    }

    public getSnapshot(): EditingSessionSnapshot<TDocument> {
        return {
            activeScope: this.activeScope,
            canRedo: this.canRedo,
            canUndo: this.canUndo,
            document: this.documentValue,
            redoDepth: this.activeScope?.redoDepth ?? this.history.redoDepth,
            redoLabel: this.redoLabel,
            undoDepth: this.activeScope?.transactionDepth ?? this.history.undoDepth,
            undoLabel: this.undoLabel,
        };
    }

    public redo(): EditingSessionChange<TDocument> {
        const result = this.executor.redo(this.documentValue);

        this.documentValue = result.document;

        return result;
    }

    public undo(): EditingSessionChange<TDocument> {
        const result = this.executor.undo(this.documentValue);

        this.documentValue = result.document;

        return result;
    }

    public updateDocument(document: TDocument): void {
        this.documentValue = document;
    }

    public executeRequest<TResult>(
        request: Request<TDocument, TResult>,
    ): RequestExecution<TDocument, TResult> {
        return this.execute(request).execution;
    }
}
