import { EditScope } from '../editing/editScope';
import { History, HistoryRecord } from '../editing/history';
import type { Request, RequestExecution } from '../editing/request';
import type {
    DocumentEditLabels,
    DocumentEditResult,
    DocumentRequestResult,
    DocumentScopeCommitResult,
} from '../editing/result';
import type { Transaction } from '../editing/transaction';

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
    private activeScopeValue: EditScope<TDocument> | null = null;
    private documentValue: TDocument;
    private historyValue: History<TDocument>;

    constructor(document: TDocument) {
        this.documentValue = document;
        this.historyValue = new History<TDocument>();
    }

    public get canRedo(): boolean {
        return this.activeScopeValue?.canRedo ?? this.historyValue.canRedo;
    }

    public get canUndo(): boolean {
        return this.activeScopeValue?.canUndo ?? this.historyValue.canUndo;
    }

    public get document(): TDocument {
        return this.documentValue;
    }

    public get hasActiveScope(): boolean {
        return this.activeScopeValue !== null;
    }

    public get redoLabel(): string | null {
        return this.activeScopeValue?.redoLabel ?? this.historyValue.redoLabel;
    }

    public get undoLabel(): string | null {
        return this.activeScopeValue?.undoLabel ?? this.historyValue.undoLabel;
    }

    public clone(): DocumentSession<TDocument> {
        const session = new DocumentSession(this.documentValue);

        session.activeScopeValue = this.activeScopeValue?.clone() ?? null;
        session.historyValue = this.historyValue.clone();

        return session;
    }

    public beginScope(input: { readonly id: string; readonly label: string }): void {
        if (this.activeScopeValue) {
            throw new Error(
                `Cannot begin edit scope ${input.id}: scope ${this.activeScopeValue.id} is already active.`,
            );
        }

        this.activeScopeValue = new EditScope(input);
    }

    public cancelScope(): DocumentEditResult<TDocument> {
        const scope = this.requireActiveScope();
        const result = scope.cancel(this.documentValue);

        this.activeScopeValue = null;

        return this.applyChange(result);
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & DocumentEditLabels = {},
    ): DocumentScopeCommitResult<TDocument> {
        const scope = this.requireActiveScope();
        const transaction = scope.confirm({
            id: input.id,
            label: input.label,
        });
        const record = transaction.isEmpty()
            ? null
            : new HistoryRecord({
                  label: input.label,
                  redoLabel: input.redoLabel,
                  transaction,
                  undoLabel: input.undoLabel,
              });
        const recorded = record ? this.historyValue.record(record) : false;

        this.activeScopeValue = null;

        return {
            document: this.documentValue,
            record,
            recorded,
            transaction,
        };
    }

    public execute<TResult>(
        request: Request<TDocument, TResult>,
    ): DocumentRequestResult<TDocument, TResult> {
        const execution = request.execute({
            activeScopeId: this.activeScopeValue?.id ?? null,
            document: this.documentValue,
        });
        const result = this.applyChange(
            this.applyTransaction(execution.transaction, execution.history),
        );

        return {
            document: result.document,
            execution,
            record: result.record,
            recorded: result.transaction !== null,
            transaction: result.transaction,
        };
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
            hasActiveScope: this.hasActiveScope,
            redoDepth: this.activeScopeValue?.redoDepth ?? this.historyValue.redoDepth,
            redoLabel: this.redoLabel,
            undoDepth: this.activeScopeValue?.transactionDepth ?? this.historyValue.undoDepth,
            undoLabel: this.undoLabel,
        };
    }

    public redo(): DocumentEditResult<TDocument> {
        if (this.activeScopeValue) {
            return this.applyChange(this.activeScopeValue.redo(this.documentValue));
        }

        return this.applyChange(this.historyValue.redo(this.documentValue));
    }

    public undo(): DocumentEditResult<TDocument> {
        if (this.activeScopeValue) {
            return this.applyChange(this.activeScopeValue.undo(this.documentValue));
        }

        return this.applyChange(this.historyValue.undo(this.documentValue));
    }

    private applyTransaction(
        transaction: Transaction<TDocument>,
        history?: DocumentEditLabels | null,
    ): DocumentEditResult<TDocument> {
        if (this.activeScopeValue) {
            return this.applyChange(
                this.activeScopeValue.push(transaction, this.documentValue, history),
            );
        }

        if (transaction.isEmpty()) {
            return {
                document: this.documentValue,
                record: null,
                transaction: null,
            };
        }

        const record = new HistoryRecord({
            label: history?.label,
            redoLabel: history?.redoLabel,
            transaction,
            undoLabel: history?.undoLabel,
        });
        const nextDocument = record.apply(this.documentValue);

        this.historyValue.record(record);

        return {
            document: nextDocument,
            record,
            transaction,
        };
    }

    private applyChange(input: DocumentEditResult<TDocument>): DocumentEditResult<TDocument> {
        this.documentValue = input.document;

        return input;
    }

    private requireActiveScope(): EditScope<TDocument> {
        if (!this.activeScopeValue) {
            throw new Error('No active edit scope.');
        }

        return this.activeScopeValue;
    }
}
