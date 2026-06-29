import {
    CadDocumentEditContext,
    createCadDocumentMutationRuntime,
    type CadDocument,
    type CadDocumentWriteContext,
} from '@occt-draw/cad-model';
import {
    DocumentEditor,
    type DocumentRequest,
    type EditDraft,
    type SelectionTarget,
} from '@occt-draw/core';
import { clearSelection, SelectionManager, type ViewNavigationState } from '@occt-draw/platform';
import { SketchEntityKind, type Sketch, type SketchEntityRef } from '@occt-draw/sketch';
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
import { getSketchEntityRefFromSelectionTarget } from '../selection/sketchSelection';
import {
    createDefaultSketchDisplayOptions,
    type EditorState,
    type SketchDisplayOptions,
    type SketchEditSession,
} from '../state/editorState';
import { createEditorStateForDocument } from '../state/createEditorStateForDocument';

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

    public executeDocumentRequest(
        request: DocumentRequest<CadDocument, unknown, CadDocumentWriteContext>,
    ): EditorState {
        const documentSession = this.state.documentSession.clone();
        const editor = new DocumentEditor({
            mutationRuntime: createCadDocumentMutationRuntime(),
            session: documentSession,
        });
        const result = editor.execute(request);

        return reconcileDocumentSelection({
            ...this.state,
            document: result.document,
            documentSession,
            draft: null,
        });
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
            const previousSketchSession = nextState.activeSketchSession;
            const nextSketchSession = result.activeSketchSession ?? null;

            nextState = {
                ...nextState,
                activeSketchSession: nextSketchSession,
            };
            nextState = reconcileSketchEditScope(nextState, previousSketchSession);
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
        const nextActiveSketchSession = shouldExitSketchSession(this.state)
            ? null
            : this.state.activeSketchSession;
        const nextState = {
            ...this.state,
            commandSession: cancelCommandSession(this.state.commandSession),
            draft: null,
            activeSketchSession: nextActiveSketchSession,
        };

        return reconcileSketchEditScope(nextState, this.state.activeSketchSession);
    }

    public confirmActiveSketchEdit(): EditorState {
        if (!this.state.activeSketchSession) {
            return this.state;
        }

        const nextState = {
            ...this.state,
            activeSketchSession: null,
            commandSession: resetToSelectCommandSession(),
            draft: null,
            selection: this.selectionManager.clear(),
        };

        return reconcileSketchEditScope(nextState, this.state.activeSketchSession);
    }

    public cancelActiveSketchEdit(): EditorState {
        if (!this.state.activeSketchSession) {
            return this.state;
        }

        const documentSession = this.state.documentSession.clone();
        const snapshot = documentSession.getSnapshot();
        const document = snapshot.hasActiveScope
            ? documentSession.cancelScope().document
            : this.state.document;

        return {
            ...this.state,
            activeSketchSession: null,
            commandSession: resetToSelectCommandSession(),
            document,
            documentSession,
            draft: null,
            selection: this.selectionManager.clear(),
        };
    }

    public clearSelection(): EditorState {
        return {
            ...this.state,
            selection: this.selectionManager.clear(),
        };
    }

    public editSketchFeature(sketchFeatureId: string): EditorState {
        if (
            this.state.activeSketchSession ||
            !resolveSketchTarget(this.state.document, sketchFeatureId)
        ) {
            return this.state;
        }

        const nextState = {
            ...this.state,
            activeSketchSession: {
                displayOptions: createDefaultSketchDisplayOptions(),
                sketchFeatureId,
                tool: { kind: 'select' as const },
            },
            commandSession: resetToSelectCommandSession(),
            draft: null,
            selection: this.selectionManager.clear(),
        };

        return reconcileSketchEditScope(nextState, this.state.activeSketchSession);
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

    public replaceDocument(document: CadDocument): EditorState {
        return createEditorStateForDocument(document, {
            viewportSize: this.state.navigation.viewportSize,
        });
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

    public updateActiveSketchDisplayOptions(
        displayOptions: Partial<SketchDisplayOptions>,
    ): EditorState {
        if (!this.state.activeSketchSession) {
            return this.state;
        }

        return {
            ...this.state,
            activeSketchSession: {
                ...this.state.activeSketchSession,
                displayOptions: {
                    ...this.state.activeSketchSession.displayOptions,
                    ...displayOptions,
                },
            },
        };
    }

    public undoDocument(): EditorState {
        const documentSession = this.state.documentSession.clone();
        const change = documentSession.undo();
        const activeSketchSession = reconcileSketchSession(this.state, change.document);

        return reconcileDocumentSelection({
            ...this.state,
            activeSketchSession,
            commandSession: activeSketchSession
                ? this.state.commandSession
                : resetToSelectCommandSession(),
            document: change.document,
            documentSession,
            draft: null,
        });
    }

    public redoDocument(): EditorState {
        const documentSession = this.state.documentSession.clone();
        const change = documentSession.redo();
        const activeSketchSession = reconcileSketchSession(this.state, change.document);

        return reconcileDocumentSelection({
            ...this.state,
            activeSketchSession,
            commandSession: activeSketchSession
                ? this.state.commandSession
                : resetToSelectCommandSession(),
            document: change.document,
            documentSession,
            draft: null,
        });
    }
}

function createCommandAvailabilityContext(state: EditorState) {
    const activePartStudio = state.document.getActivePartStudio();
    const selectedReferencePlaneCount = state.selection.selection.objectIds.filter((objectId) => {
        const object = activePartStudio.findObjectById(objectId);

        return object?.kind === 'reference-plane';
    }).length;

    return {
        activeSketchTool: state.activeSketchSession?.tool.kind ?? null,
        hasSketchProfile: false,
        isEditingSketch: state.activeSketchSession !== null,
        selectionObjectIds: state.selection.selection.objectIds,
        selectedReferencePlaneCount,
    };
}

function shouldExitSketchSession(state: EditorState): boolean {
    const tool = state.activeSketchSession?.tool;

    if (!tool) {
        return false;
    }

    if (tool.kind === 'circle' || tool.kind === 'center-rectangle') {
        return tool.center === null;
    }

    if (tool.kind === 'aligned-rectangle') {
        return tool.firstEdge === null;
    }

    if (tool.kind === 'center-arc') {
        return tool.centerPoint === null && tool.startPoint === null;
    }

    if (tool.kind === 'ellipse') {
        return tool.centerPoint === null && tool.primaryAxisPoint === null;
    }

    if (tool.kind === 'elliptical-arc') {
        return (
            tool.centerPoint === null &&
            tool.primaryAxisPoint === null &&
            tool.secondaryPoint === null &&
            tool.startPoint === null
        );
    }

    if (tool.kind === 'conic') {
        return tool.startPoint === null && tool.endPoint === null;
    }

    if (tool.kind === 'tangent-arc') {
        return (
            tool.startPoint === null && tool.startTangent === null && tool.startVertexId === null
        );
    }

    if (tool.kind === 'line') {
        return tool.start === null;
    }

    if (tool.kind === 'midpoint-line') {
        return tool.midpoint === null;
    }

    if (tool.kind === 'rectangle') {
        return tool.firstCorner === null;
    }

    if (tool.kind === 'three-point-arc') {
        return tool.startPoint === null && tool.endPoint === null;
    }

    return true;
}

function reconcileSketchEditScope(
    state: EditorState,
    previousSketchSession: SketchEditSession | null,
): EditorState {
    if (!previousSketchSession && state.activeSketchSession) {
        const documentSession = state.documentSession.clone();
        const snapshot = documentSession.getSnapshot();

        if (!snapshot.hasActiveScope) {
            documentSession.beginScope({
                id: `sketch-edit:${state.activeSketchSession.sketchFeatureId}`,
                label: `Edit ${state.activeSketchSession.sketchFeatureId}`,
            });
        }

        return {
            ...state,
            documentSession,
        };
    }

    if (previousSketchSession && !state.activeSketchSession) {
        const documentSession = state.documentSession.clone();
        const snapshot = documentSession.getSnapshot();

        if (snapshot.hasActiveScope) {
            documentSession.confirmScope({
                id: `sketch-edit:${previousSketchSession.sketchFeatureId}`,
                label: `Edit ${previousSketchSession.sketchFeatureId}`,
            });
        }

        return {
            ...state,
            documentSession,
        };
    }

    return state;
}

function reconcileSketchSession(
    state: EditorState,
    document: CadDocument,
): EditorState['activeSketchSession'] {
    const session = state.activeSketchSession;

    if (!session) {
        return null;
    }

    const target = resolveSketchTarget(document, session.sketchFeatureId);

    if (!target) {
        return null;
    }

    return reconcileSketchLineStart(session, target.sketch);
}

function reconcileSketchLineStart(session: SketchEditSession, sketch: Sketch): SketchEditSession {
    if (session.tool.kind !== 'line' || session.tool.start?.kind !== 'vertex') {
        return session;
    }

    return sketch.entities.topology.vertices.get(session.tool.start.vertexId)
        ? session
        : {
              ...session,
              tool: { kind: 'line', start: null },
          };
}

function reconcileDocumentSelection(state: EditorState): EditorState {
    const primaryTarget = state.selection.selection.primaryTarget;

    if (!primaryTarget || isValidSelectionTarget(state, primaryTarget)) {
        return state;
    }

    return {
        ...state,
        selection: clearSelection(state.selection),
    };
}

function isValidSelectionTarget(state: EditorState, target: SelectionTarget): boolean {
    const sketchEntityRef = getSketchEntityRefFromSelectionTarget(target);

    if (sketchEntityRef) {
        return hasSketchEntity(state, sketchEntityRef);
    }

    return Boolean(state.document.getActivePartStudio().findObjectById(target.objectId));
}

function hasSketchEntity(state: EditorState, ref: SketchEntityRef): boolean {
    const target = state.activeSketchSession
        ? resolveSketchTarget(state.document, state.activeSketchSession.sketchFeatureId)
        : null;

    if (target?.sketch.id !== ref.sketchId) {
        return false;
    }

    if (ref.kind === SketchEntityKind.Curve) {
        return Boolean(target.sketch.entities.geometry.curves.get(ref.id));
    }

    if (ref.kind === SketchEntityKind.Edge) {
        return Boolean(target.sketch.entities.topology.edges.get(ref.id));
    }

    if (ref.kind === SketchEntityKind.Vertex) {
        return Boolean(target.sketch.entities.topology.vertices.get(ref.id));
    }

    if (ref.kind === SketchEntityKind.Point) {
        return Boolean(target.sketch.entities.geometry.points.get(ref.id));
    }

    return false;
}

function resolveSketchTarget(
    document: CadDocument,
    sketchFeatureId: SketchEditSession['sketchFeatureId'],
) {
    try {
        return CadDocumentEditContext.begin(document, {
            id: `resolve-sketch:${sketchFeatureId}`,
            label: `Resolve ${sketchFeatureId}`,
        }).requireSketchTarget({
            partStudioId: document.getActivePartStudio().id,
            sketchFeatureId,
        });
    } catch {
        return null;
    }
}
