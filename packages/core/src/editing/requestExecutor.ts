import { EditScope, type EditScopeId, type EditScopeMoveResult } from './editScope';
import {
    History,
    HistoryRecord,
    type HistoryMoveResult,
    type HistoryRecordLabels,
} from './history';
import type { Request, RequestExecution } from './request';
import type { Transaction } from './transaction';

export interface RequestExecutorResult<TDocument = unknown, TResult = void> {
    readonly document: TDocument;
    readonly execution: RequestExecution<TDocument, TResult>;
    readonly recorded: boolean;
}

export interface ScopeCommitResult<TDocument = unknown> {
    readonly record: HistoryRecord<TDocument> | null;
    readonly recorded: boolean;
    readonly transaction: Transaction<TDocument>;
}

export class RequestExecutor<TDocument = unknown> {
    private activeScopeValue: EditScope<TDocument> | null = null;
    private readonly historyValue: History<TDocument>;

    constructor(input: { readonly history?: History<TDocument> } = {}) {
        this.historyValue = input.history ?? new History<TDocument>();
    }

    public get activeScope(): EditScope<TDocument> | null {
        return this.activeScopeValue;
    }

    public get history(): History<TDocument> {
        return this.historyValue;
    }

    public clone(): RequestExecutor<TDocument> {
        const executor = new RequestExecutor({
            history: this.historyValue.clone(),
        });

        executor.activeScopeValue = this.activeScopeValue?.clone() ?? null;

        return executor;
    }

    public beginScope(input: {
        readonly id: EditScopeId;
        readonly label: string;
    }): EditScope<TDocument> {
        if (this.activeScopeValue) {
            throw new Error(
                `Cannot begin edit scope ${input.id}: scope ${this.activeScopeValue.id} is already active.`,
            );
        }

        this.activeScopeValue = new EditScope(input);

        return this.activeScopeValue;
    }

    public cancelScope(document: TDocument): EditScopeMoveResult<TDocument> {
        const scope = this.requireActiveScope();
        const result = scope.cancel(document);

        this.activeScopeValue = null;

        return result;
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & HistoryRecordLabels = {},
    ): ScopeCommitResult<TDocument> {
        const scope = this.requireActiveScope();
        const transaction = scope.confirm({
            id: input.id,
            label: input.record ?? input.label,
        });
        const record = transaction.isEmpty()
            ? null
            : new HistoryRecord({
                  record: input.record,
                  redoLabel: input.redoLabel,
                  transaction,
                  undoLabel: input.undoLabel,
              });
        const recorded = record ? this.historyValue.record(record) : false;

        this.activeScopeValue = null;

        return { record, recorded, transaction };
    }

    public execute<TResult>(
        request: Request<TDocument, TResult>,
        document: TDocument,
    ): RequestExecutorResult<TDocument, TResult> {
        const execution = request.execute({
            activeScopeId: this.activeScopeValue?.id ?? null,
            document,
        });
        const recordResult = this.recordTransaction(
            execution.transaction,
            document,
            execution.history,
        );

        return {
            document: recordResult.document,
            execution,
            recorded: recordResult.transaction !== null,
        };
    }

    public redo(document: TDocument): HistoryMoveResult<TDocument> {
        if (this.activeScopeValue) {
            return this.activeScopeValue.redo(document);
        }

        return this.historyValue.redo(document);
    }

    public undo(document: TDocument): HistoryMoveResult<TDocument> {
        if (this.activeScopeValue) {
            return this.activeScopeValue.undo(document);
        }

        return this.historyValue.undo(document);
    }

    private recordTransaction(
        transaction: Transaction<TDocument>,
        document: TDocument,
        history?: HistoryRecordLabels | null,
    ): EditScopeMoveResult<TDocument> {
        if (this.activeScopeValue) {
            return this.activeScopeValue.push(transaction, document, history);
        }

        if (transaction.isEmpty()) {
            return { document, record: null, transaction: null };
        }

        const record = new HistoryRecord({
            record: history?.record,
            redoLabel: history?.redoLabel,
            transaction,
            undoLabel: history?.undoLabel,
        });
        const nextDocument = record.apply(document);

        this.historyValue.record(record);

        return { document: nextDocument, record, transaction };
    }

    private requireActiveScope(): EditScope<TDocument> {
        if (!this.activeScopeValue) {
            throw new Error('No active edit scope.');
        }

        return this.activeScopeValue;
    }
}
