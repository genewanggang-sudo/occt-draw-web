import type { DocumentEditLabels } from './result';
import type { Transaction } from './transaction';

export interface DocumentWriteContext<TDocument = unknown> {
    readonly __documentType?: TDocument | undefined;
}

export interface DocumentRequest<
    TDocument = unknown,
    TResult = void,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    readonly id: string;
    readonly label: string;
    execute(context: TContext): TResult;
}

export interface MutationScope<
    TDocument = unknown,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    readonly context: TContext;
    readonly workingDocument: TDocument;
    commit(): Transaction<TDocument>;
    discard(): void;
}

export interface DocumentMutationRuntime<
    TDocument = unknown,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    begin(input: DocumentMutationInput<TDocument>): MutationScope<TDocument, TContext>;
}

export interface DocumentMutationInput<TDocument = unknown> extends DocumentEditLabels {
    readonly document: TDocument;
    readonly id: string;
    readonly label: string;
}

export interface RequestContext<TDocument = unknown> {
    readonly document: TDocument;
    readonly activeScopeId: string | null;
}

export interface RequestExecution<TDocument = unknown, TResult = void> {
    readonly history?: DocumentEditLabels | null;
    readonly result: TResult;
    readonly transaction: Transaction<TDocument>;
}

/**
 * Formal document mutation entrypoint.
 *
 * UI commands and application services should express edits as Requests. A Request
 * reads the current document context and returns a Transaction that records the
 * resulting model changes; DocumentSession is responsible for applying and
 * recording that Transaction.
 */
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
