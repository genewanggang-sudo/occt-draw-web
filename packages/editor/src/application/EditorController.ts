import { findSketchByFeatureId, type CadDocument } from '@occt-draw/cad-model';
import type { EditDraft, Request, SelectionTarget } from '@occt-draw/core';
import { SelectionManager, type ViewNavigationState } from '@occt-draw/platform';
import type { CommandResult } from '../commands/CadCommand';
import {
    activateCommandSession,
    cancelCommandSession,
    completeCommandSession,
    consumeSelectionForCommandSession,
    resetToSelectCommandSession,
    updateCommandSessionMessage,
} from '../commands/commandReducer';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState, SketchEditSession } from '../state/editorState';

export class EditorController {
    private readonly selectionManager: SelectionManager;
    private readonly state: EditorState;

    constructor(state: EditorState) {
        this.state = state;
        this.selectionManager = new SelectionManager(state.selection);
    }

    public activateCommand(commandId: CommandId): EditorState {
        return {
            ...this.state,
            commandSession: activateCommandSession(
                this.state.commandSession,
                commandId,
                createCommandAvailabilityContext(this.state),
            ),
        };
    }

    public executeDocumentRequest(request: Request<CadDocument, unknown>): EditorState {
        const documentSession = this.state.documentSession.clone();
        const result = documentSession.execute(request);

        return {
            ...this.state,
            document: result.document,
            documentSession,
            draft: null,
        };
    }

    public applyNavigation(navigation: ViewNavigationState): EditorState {
        return {
            ...this.state,
            navigation,
        };
    }

    public applyCommandResult(result: CommandResult): EditorState {
        let nextState = this.state;

        if (result.commandSession) {
            nextState = {
                ...nextState,
                commandSession: result.commandSession,
            };
        }

        if (result.message) {
            nextState = new EditorController(nextState).updateCommandMessage(result.message);
        }

        if (result.selection) {
            nextState = {
                ...nextState,
                selection: result.selection,
            };
        }

        if ('activeSketchSession' in result) {
            nextState = {
                ...nextState,
                activeSketchSession: result.activeSketchSession ?? null,
            };
        }

        if (result.navigation) {
            nextState = {
                ...nextState,
                navigation: result.navigation,
            };
        }

        if ('draft' in result) {
            nextState = {
                ...nextState,
                draft: result.draft ?? null,
            };
        }

        if (result.documentRequest) {
            nextState = new EditorController(nextState).executeDocumentRequest(
                result.documentRequest,
            );
        }

        return nextState;
    }

    public cancelActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: cancelCommandSession(this.state.commandSession),
            draft: null,
            activeSketchSession: shouldExitSketchSession(this.state)
                ? null
                : this.state.activeSketchSession,
        };
    }

    public clearSelection(): EditorState {
        return {
            ...this.state,
            selection: this.selectionManager.clear(),
        };
    }

    public completeActiveCommand(): EditorState {
        return {
            ...this.state,
            commandSession: completeCommandSession(this.state.commandSession),
            draft: null,
        };
    }

    public preselectTarget(target: SelectionTarget | null): EditorState {
        if (this.state.commandSession.id !== 'select') {
            return {
                ...this.state,
                selection: this.selectionManager.preselect(null),
            };
        }

        return {
            ...this.state,
            selection: this.selectionManager.preselect(target),
        };
    }

    public replaceDraft(draft: EditDraft<CadDocument> | null): EditorState {
        return {
            ...this.state,
            draft,
        };
    }

    public replaceSelection(target: SelectionTarget | null): EditorState {
        if (this.state.commandSession.id !== 'select') {
            return this.state;
        }

        const nextSelection = this.selectionManager.replaceWith(target);
        const nextCommandSession = consumeSelectionForCommandSession(
            this.state.commandSession,
            nextSelection.selection,
        );

        return {
            ...this.state,
            commandSession: nextCommandSession,
            selection: nextSelection,
        };
    }

    public resetToSelectCommand(): EditorState {
        return {
            ...this.state,
            commandSession: resetToSelectCommandSession(),
            draft: null,
        };
    }

    public updateCommandMessage(message: string): EditorState {
        return {
            ...this.state,
            commandSession: updateCommandSessionMessage(this.state.commandSession, message),
        };
    }

    public undoDocument(): EditorState {
        const documentSession = this.state.documentSession.clone();
        const change = documentSession.undo();
        const activeSketchSession = reconcileSketchSession(this.state, change.document);

        return {
            ...this.state,
            activeSketchSession,
            commandSession: activeSketchSession
                ? this.state.commandSession
                : resetToSelectCommandSession(),
            document: change.document,
            documentSession,
            draft: null,
        };
    }

    public redoDocument(): EditorState {
        const documentSession = this.state.documentSession.clone();
        const change = documentSession.redo();
        const activeSketchSession = reconcileSketchSession(this.state, change.document);

        return {
            ...this.state,
            activeSketchSession,
            commandSession: activeSketchSession
                ? this.state.commandSession
                : resetToSelectCommandSession(),
            document: change.document,
            documentSession,
            draft: null,
        };
    }
}

function createCommandAvailabilityContext(state: EditorState) {
    const activePartStudio = state.document.getActivePartStudio();
    const selectedReferencePlaneCount = state.selection.selection.objectIds.filter((objectId) => {
        const object = activePartStudio.findObjectById(objectId);

        return object?.kind === 'reference-plane';
    }).length;

    return {
        activeSketchTool: state.activeSketchSession?.activeTool ?? null,
        hasSketchProfile: false,
        isEditingSketch: state.activeSketchSession !== null,
        selectionObjectIds: state.selection.selection.objectIds,
        selectedReferencePlaneCount,
    };
}

function shouldExitSketchSession(state: EditorState): boolean {
    return state.activeSketchSession?.pendingLineStart === null;
}

function reconcileSketchSession(
    state: EditorState,
    document: CadDocument,
): EditorState['activeSketchSession'] {
    const session = state.activeSketchSession;

    if (!session) {
        return null;
    }

    const sketch = findSketchByFeatureId(document.getActivePartStudio(), session.sketchFeatureId);

    if (!sketch) {
        return null;
    }

    return reconcileSketchLineStart(session, sketch);
}

function reconcileSketchLineStart(
    session: SketchEditSession,
    sketch: NonNullable<ReturnType<typeof findSketchByFeatureId>>,
): SketchEditSession {
    if (session.pendingLineStart?.kind !== 'vertex') {
        return session;
    }

    return sketch.entities.topology.vertices.get(session.pendingLineStart.vertexId)
        ? session
        : {
              ...session,
              pendingLineStart: null,
          };
}
