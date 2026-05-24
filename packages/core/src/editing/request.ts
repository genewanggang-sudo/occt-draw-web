import type { DocumentEditLabels } from './result';
import type { Transaction } from './transaction';

export interface RequestContext<TDocument = unknown> {
    readonly document: TDocument;
    readonly activeScopeId: string | null;
}

export interface RequestExecution<TDocument = unknown, TResult = void> {
    readonly history?: DocumentEditLabels | null;
    readonly result: TResult;
    readonly transaction: Transaction<TDocument>;
}

export interface Request<TDocument = unknown, TResult = void> {
    readonly label: string;
    execute(context: RequestContext<TDocument>): RequestExecution<TDocument, TResult>;
}

export function createRequestExecution<TDocument, TResult>(input: {
    readonly history?: DocumentEditLabels | null;
    readonly result: TResult;
    readonly transaction: Transaction<TDocument>;
}): RequestExecution<TDocument, TResult> {
    return {
        history: input.history ?? null,
        result: input.result,
        transaction: input.transaction,
    };
}
