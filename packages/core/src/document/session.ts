import { EditingSession } from '../editing/editingSession';
import type { HistoryRecordLabels } from '../editing/history';
import type { Request, RequestExecution } from '../editing/request';
import type { Transaction } from '../editing/transaction';

export interface DocumentSessionChange<TDocument = unknown> {
    readonly document: TDocument;
    readonly transaction: Transaction<TDocument> | null;
}

export interface DocumentSessionRequestResult<TDocument = unknown, TResult = void> {
    readonly document: TDocument;
    readonly execution: RequestExecution<TDocument, TResult>;
    readonly recorded: boolean;
}

export interface DocumentSessionScopeCommitResult<TDocument = unknown> {
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
    private readonly session: EditingSession<TDocument>;

    constructor(document: TDocument, session?: EditingSession<TDocument>) {
        this.session = session ?? new EditingSession({ document });
    }

    public static fromEditingSession<TDocument>(
        session: EditingSession<TDocument>,
    ): DocumentSession<TDocument> {
        return new DocumentSession(session.document, session);
    }

    public get canRedo(): boolean {
        return this.session.canRedo;
    }

    public get canUndo(): boolean {
        return this.session.canUndo;
    }

    public get document(): TDocument {
        return this.session.document;
    }

    public get redoLabel(): string | null {
        return this.session.redoLabel;
    }

    public get undoLabel(): string | null {
        return this.session.undoLabel;
    }

    public clone(): DocumentSession<TDocument> {
        return DocumentSession.fromEditingSession(this.session.clone());
    }

    public beginScope(input: { readonly id: string; readonly label: string }): void {
        this.session.beginScope(input);
    }

    public cancelScope(): DocumentSessionChange<TDocument> {
        return toDocumentSessionChange(this.session.cancelScope());
    }

    public confirmScope(
        input: {
            readonly id?: string | undefined;
            readonly label?: string | undefined;
        } & HistoryRecordLabels = {},
    ): DocumentSessionScopeCommitResult<TDocument> {
        const result = this.session.confirmScope(input);

        return {
            recorded: result.recorded,
            transaction: result.transaction,
        };
    }

    public execute<TResult>(
        request: Request<TDocument, TResult>,
    ): DocumentSessionRequestResult<TDocument, TResult> {
        return this.session.execute(request);
    }

    public executeRequest<TResult>(
        request: Request<TDocument, TResult>,
    ): RequestExecution<TDocument, TResult> {
        return this.session.executeRequest(request);
    }

    public getSnapshot(): DocumentSessionSnapshot<TDocument> {
        const snapshot = this.session.getSnapshot();

        return {
            canRedo: snapshot.canRedo,
            canUndo: snapshot.canUndo,
            document: snapshot.document,
            hasActiveScope: snapshot.activeScope !== null,
            redoDepth: snapshot.redoDepth,
            redoLabel: snapshot.redoLabel,
            undoDepth: snapshot.undoDepth,
            undoLabel: snapshot.undoLabel,
        };
    }

    public redo(): DocumentSessionChange<TDocument> {
        return toDocumentSessionChange(this.session.redo());
    }

    public undo(): DocumentSessionChange<TDocument> {
        return toDocumentSessionChange(this.session.undo());
    }
}

function toDocumentSessionChange<TDocument>(input: {
    readonly document: TDocument;
    readonly transaction: Transaction<TDocument> | null;
}): DocumentSessionChange<TDocument> {
    return {
        document: input.document,
        transaction: input.transaction,
    };
}
