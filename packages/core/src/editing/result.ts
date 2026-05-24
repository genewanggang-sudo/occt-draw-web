import type { HistoryRecord } from './history';
import type { RequestExecution } from './request';
import type { Transaction } from './transaction';

export interface DocumentEditLabels {
    readonly label?: string | undefined;
    readonly redoLabel?: string | undefined;
    readonly undoLabel?: string | undefined;
}

export interface DocumentEditResult<TDocument = unknown> {
    readonly document: TDocument;
    readonly record: HistoryRecord<TDocument> | null;
    readonly transaction: Transaction<TDocument> | null;
}

export interface DocumentRequestResult<
    TDocument = unknown,
    TResult = void,
> extends DocumentEditResult<TDocument> {
    readonly execution: RequestExecution<TDocument, TResult>;
    readonly recorded: boolean;
}

export interface DocumentScopeCommitResult<
    TDocument = unknown,
> extends DocumentEditResult<TDocument> {
    readonly recorded: boolean;
    readonly transaction: Transaction<TDocument>;
}
