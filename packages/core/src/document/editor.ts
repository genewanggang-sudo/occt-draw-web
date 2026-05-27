import { DocumentSession, type DocumentSessionSnapshot } from './session';
import {
    createRequestExecution,
    type DocumentMutationRuntime,
    type DocumentRequest,
    type DocumentWriteContext,
    type Request,
} from '../editing/request';
import type {
    DocumentEditLabels,
    DocumentEditResult,
    DocumentPreviewResult,
    DocumentRequestResult,
    DocumentScopeCommitResult,
} from '../editing/result';

export class DocumentEditor<
    TDocument = unknown,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    private readonly session: DocumentSession<TDocument>;
    private readonly mutationRuntime: DocumentMutationRuntime<TDocument, TContext> | null;

    constructor(
        input:
            | DocumentEditorInput<TDocument, TContext>
            | DocumentEditorSessionInput<TDocument, TContext>
            | DocumentSession<TDocument>
            | TDocument,
    ) {
        if (input instanceof DocumentSession) {
            this.session = input;
            this.mutationRuntime = null;
            return;
        }

        if (isDocumentEditorSessionInput<TDocument, TContext>(input)) {
            this.session = input.session;
            this.mutationRuntime = input.mutationRuntime ?? null;
            return;
        }

        if (isDocumentEditorDocumentInput<TDocument, TContext>(input)) {
            this.session = new DocumentSession(input.document);
            this.mutationRuntime = input.mutationRuntime ?? null;
            return;
        }

        this.session = new DocumentSession(input);
        this.mutationRuntime = null;
    }

    public get document(): TDocument {
        return this.session.document;
    }

    public get canRedo(): boolean {
        return this.session.canRedo;
    }

    public get canUndo(): boolean {
        return this.session.canUndo;
    }

    public get hasActiveScope(): boolean {
        return this.session.hasActiveScope;
    }

    public get redoLabel(): string | null {
        return this.session.redoLabel;
    }

    public get undoLabel(): string | null {
        return this.session.undoLabel;
    }

    public beginScope(input: { readonly id: string; readonly label: string }): void {
        this.session.beginScope(input);
    }

    public cancelScope(): DocumentEditResult<TDocument> {
        return this.session.cancelScope();
    }

    public clone(): DocumentEditor<TDocument, TContext> {
        return new DocumentEditor({
            mutationRuntime: this.mutationRuntime ?? undefined,
            session: this.session.clone(),
        });
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & DocumentEditLabels = {},
    ): DocumentScopeCommitResult<TDocument> {
        return this.session.confirmScope(input);
    }

    public execute<TResult>(
        request: DocumentRequest<TDocument, TResult, TContext> | Request<TDocument, TResult>,
    ): DocumentRequestResult<TDocument, TResult> {
        return isDocumentRequest(request)
            ? this.executeDocumentRequest(request)
            : this.session.execute(request);
    }

    public getSnapshot(): DocumentSessionSnapshot<TDocument> {
        return this.session.getSnapshot();
    }

    public preview<TResult>(
        request: DocumentRequest<TDocument, TResult, TContext> | Request<TDocument, TResult>,
    ): DocumentPreviewResult<TDocument, TResult> {
        return isDocumentRequest(request)
            ? this.previewDocumentRequest(request)
            : this.previewLegacy(request);
    }

    public previewLegacy<TResult>(
        request: Request<TDocument, TResult>,
    ): DocumentPreviewResult<TDocument, TResult> {
        const execution = request.execute({
            activeScopeId: null,
            document: this.session.document,
        });

        return {
            result: execution.result,
            transaction: execution.transaction,
            workingDocument: execution.transaction.apply(this.session.document),
        };
    }

    public redo(): DocumentEditResult<TDocument> {
        return this.session.redo();
    }

    public undo(): DocumentEditResult<TDocument> {
        return this.session.undo();
    }

    private executeDocumentRequest<TResult>(
        request: DocumentRequest<TDocument, TResult, TContext>,
    ): DocumentRequestResult<TDocument, TResult> {
        const scope = this.requireMutationRuntime().begin({
            document: this.session.document,
            id: request.id,
            label: request.label,
        });

        try {
            const result = request.execute(scope.context);
            const transaction = scope.commit();
            const execution = createRequestExecution({
                history: readDocumentRequestHistory(request),
                result,
                transaction,
            });

            return this.session.execute({
                label: request.label,
                execute: () => execution,
            });
        } catch (error) {
            scope.discard();
            throw error;
        }
    }

    private previewDocumentRequest<TResult>(
        request: DocumentRequest<TDocument, TResult, TContext>,
    ): DocumentPreviewResult<TDocument, TResult> {
        const scope = this.requireMutationRuntime().begin({
            document: this.session.document,
            id: request.id,
            label: request.label,
        });

        try {
            const result = request.execute(scope.context);
            const transaction = scope.commit();

            return {
                result,
                transaction,
                workingDocument: scope.workingDocument,
            };
        } catch (error) {
            scope.discard();
            throw error;
        }
    }

    private requireMutationRuntime(): DocumentMutationRuntime<TDocument, TContext> {
        if (!this.mutationRuntime) {
            throw new Error('DocumentEditor requires a mutation runtime for DocumentRequest.');
        }

        return this.mutationRuntime;
    }
}

export interface DocumentEditorInput<
    TDocument = unknown,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    readonly document: TDocument;
    readonly mutationRuntime?: DocumentMutationRuntime<TDocument, TContext> | undefined;
    readonly session?: never;
}

export interface DocumentEditorSessionInput<
    TDocument = unknown,
    TContext extends DocumentWriteContext<TDocument> = DocumentWriteContext<TDocument>,
> {
    readonly mutationRuntime?: DocumentMutationRuntime<TDocument, TContext> | undefined;
    readonly session: DocumentSession<TDocument>;
}

function isDocumentEditorSessionInput<TDocument, TContext extends DocumentWriteContext<TDocument>>(
    input: unknown,
): input is DocumentEditorSessionInput<TDocument, TContext> {
    return typeof input === 'object' && input !== null && 'session' in input;
}

function isDocumentEditorDocumentInput<TDocument, TContext extends DocumentWriteContext<TDocument>>(
    input: unknown,
): input is DocumentEditorInput<TDocument, TContext> {
    return typeof input === 'object' && input !== null && 'document' in input;
}

function isDocumentRequest<TDocument, TResult, TContext extends DocumentWriteContext<TDocument>>(
    request: DocumentRequest<TDocument, TResult, TContext> | Request<TDocument, TResult>,
): request is DocumentRequest<TDocument, TResult, TContext> {
    return 'id' in request;
}

function readDocumentRequestHistory<TDocument, TResult>(
    request: DocumentRequest<TDocument, TResult> & { readonly history?: DocumentEditLabels | null },
): DocumentEditLabels | null {
    return request.history ?? { label: request.label };
}
