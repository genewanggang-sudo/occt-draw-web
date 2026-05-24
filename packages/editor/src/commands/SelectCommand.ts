import { createEditDraft, type SelectionTarget } from '@occt-draw/core';
import {
    findSketchByFeatureId,
    SetFeaturePayloadRequest,
    type CadDocument,
} from '@occt-draw/cad-model';
import { Measurement } from '@occt-draw/math';
import {
    DeleteSketchEntityRequest,
    MoveVertexRequest,
    SketchEntityKind,
    type Sketch,
    type SketchEntityRef,
} from '@occt-draw/sketch';
import {
    clearSelection,
    replaceSelection,
    updatePreselection,
    type ScreenPoint,
} from '@occt-draw/platform';
import type { EditorState } from '../state/editorState';
import { getSketchEntityRefFromSelectionTarget } from '../selection/sketchSelection';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandKeyEvent,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { consumeSelectionForCommandSession } from './commandReducer';
import { projectScreenPointToSketch2 } from './sketchProjection';

type PendingSelectionPointer =
    | {
          readonly kind: 'selection-click';
          readonly pointerId: number;
          readonly point: ScreenPoint;
      }
    | {
          readonly entityRef: Extract<SketchEntityRef, { readonly kind: SketchEntityKind.Vertex }>;
          readonly kind: 'vertex-drag-candidate';
          readonly pointerId: number;
          readonly point: ScreenPoint;
          readonly target: SelectionTarget;
      }
    | {
          readonly entityRef: Extract<SketchEntityRef, { readonly kind: SketchEntityKind.Vertex }>;
          readonly kind: 'vertex-dragging';
          readonly pointerId: number;
          readonly target: SelectionTarget;
      };

const CLICK_SELECTION_TOLERANCE_PIXELS = 4;

export class SelectCommand extends CadCommand {
    public readonly id = 'select';
    private pendingSelectionPointer: PendingSelectionPointer | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (state.activeSketchSession) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...state.activeSketchSession,
                    activeTool: 'select',
                    pendingLineStart: null,
                    pendingRectangleStart: null,
                },
                draft: null,
            });
        }

        return createHandledCommandResult({ draft: null });
    }

    public override cancel(): CommandResult {
        this.pendingSelectionPointer = null;
        return createHandledCommandResult({ draft: null });
    }

    public override exit(): CommandResult {
        this.pendingSelectionPointer = null;
        return createHandledCommandResult();
    }

    public override pointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const target = context.pick(event.point);
        const entityRef = getSketchEntityRefFromSelectionTarget(target);
        const activeSketch = findActiveSketch(context.getState());

        if (
            target &&
            entityRef?.kind === SketchEntityKind.Vertex &&
            activeSketch?.sketch.id === entityRef.sketchId
        ) {
            this.pendingSelectionPointer = {
                entityRef,
                kind: 'vertex-drag-candidate',
                pointerId: event.pointerId,
                point: event.point,
                target,
            };

            return createHandledCommandResult();
        }

        this.pendingSelectionPointer = {
            kind: 'selection-click',
            pointerId: event.pointerId,
            point: event.point,
        };

        return createHandledCommandResult();
    }

    public override pointerCancel(): CommandResult {
        this.pendingSelectionPointer = null;
        return createHandledCommandResult({ draft: null });
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (this.pendingSelectionPointer?.pointerId === event.pointerId) {
            return this.pointerMoveWithPendingPointer(event, context);
        }

        if (event.buttons !== 0) {
            return createUnhandledCommandResult();
        }

        const target = context.pick(event.point);
        const currentState = context.getState();

        return createHandledCommandResult({
            selection: updatePreselection(currentState.selection, target),
        });
    }

    public override pointerUp(event: CommandPointerEvent, context: CommandContext): CommandResult {
        const pendingSelectionPointer = this.pendingSelectionPointer;

        if (pendingSelectionPointer?.pointerId !== event.pointerId) {
            return createUnhandledCommandResult();
        }

        this.pendingSelectionPointer = null;

        if (pendingSelectionPointer.kind === 'vertex-dragging') {
            return this.commitVertexDrag(event, context, pendingSelectionPointer);
        }

        if (
            Measurement.distance2(event.point, pendingSelectionPointer.point).value >
            CLICK_SELECTION_TOLERANCE_PIXELS
        ) {
            return createHandledCommandResult({ draft: null });
        }

        const target = context.pick(event.point);
        const currentState = context.getState();
        const selection = replaceSelection(currentState.selection, target);

        return createHandledCommandResult({
            commandSession: consumeSelectionForCommandSession(
                currentState.commandSession,
                selection.selection,
            ),
            selection,
        });
    }

    private pointerMoveWithPendingPointer(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const pending = this.pendingSelectionPointer;

        if (!pending) {
            return createUnhandledCommandResult();
        }

        if (pending.kind === 'selection-click') {
            return createHandledCommandResult();
        }

        if (
            pending.kind === 'vertex-drag-candidate' &&
            Measurement.distance2(event.point, pending.point).value <=
                CLICK_SELECTION_TOLERANCE_PIXELS
        ) {
            return createHandledCommandResult();
        }

        const draft = createVertexMoveDraft(context.getState(), pending.entityRef, event);

        if (!draft) {
            return createHandledCommandResult();
        }

        this.pendingSelectionPointer = {
            entityRef: pending.entityRef,
            kind: 'vertex-dragging',
            pointerId: pending.pointerId,
            target: pending.target,
        };

        return createHandledCommandResult({
            draft,
            selection: replaceSelection(context.getState().selection, pending.target),
        });
    }

    private commitVertexDrag(
        event: CommandPointerEvent,
        context: CommandContext,
        pending: Extract<PendingSelectionPointer, { readonly kind: 'vertex-dragging' }>,
    ): CommandResult {
        const state = context.getState();
        const request = createMoveVertexRequestFromPointer(state, pending.entityRef, event);

        if (!request) {
            return createHandledCommandResult({ draft: null });
        }

        const selection = replaceSelection(state.selection, pending.target);

        return createHandledCommandResult({
            commandSession: consumeSelectionForCommandSession(
                state.commandSession,
                selection.selection,
            ),
            documentRequest: request,
            draft: null,
            selection,
        });
    }

    public override keyDown(event: CommandKeyEvent, context: CommandContext): CommandResult {
        if (event.key !== 'Delete' && event.key !== 'Backspace') {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const entityRef = getSketchEntityRefFromSelectionTarget(
            state.selection.selection.primaryTarget,
        );

        if (!entityRef || !isDeletableSketchRef(entityRef)) {
            return createUnhandledCommandResult();
        }

        const activeSketch = findActiveSketch(state);

        if (activeSketch?.sketch.id !== entityRef.sketchId) {
            return createUnhandledCommandResult();
        }

        const sketch = activeSketch.sketch.clone();
        const request = new DeleteSketchEntityRequest({ entityRef });
        const operation = request.createOperation();

        operation.apply(sketch);

        return createHandledCommandResult({
            commandSession: consumeSelectionForCommandSession(
                state.commandSession,
                clearSelection(state.selection).selection,
            ),
            documentRequest: createSetSketchPayloadRequest(state, sketch),
            draft: null,
            selection: clearSelection(state.selection),
        });
    }
}

function findActiveSketch(state: EditorState): { readonly sketch: Sketch } | null {
    const session = state.activeSketchSession;

    if (!session) {
        return null;
    }

    const partStudio = state.document.getActivePartStudio();
    const sketch = findSketchByFeatureId(partStudio, session.sketchFeatureId);

    return sketch ? { sketch } : null;
}

function isDeletableSketchRef(ref: SketchEntityRef): boolean {
    return ref.kind === SketchEntityKind.Edge || ref.kind === SketchEntityKind.Vertex;
}

function createSetSketchPayloadRequest(
    state: EditorState,
    sketch: Sketch,
): SetFeaturePayloadRequest {
    const partStudio = state.document.getActivePartStudio();

    return new SetFeaturePayloadRequest({
        label: `Update ${sketch.name}`,
        partStudioId: partStudio.id,
        payload: sketch,
        payloadId: sketch.id,
        transactionId: `set-sketch-payload:${sketch.id}`,
    });
}

function createVertexMoveDraft(
    state: EditorState,
    entityRef: Extract<SketchEntityRef, { readonly kind: SketchEntityKind.Vertex }>,
    event: CommandPointerEvent,
) {
    const request = createMoveVertexRequestFromPointer(state, entityRef, event);

    if (!request) {
        return null;
    }

    return createEditDraft<CadDocument>({
        id: 'draft:move-sketch-vertex',
        kind: 'transform',
    }).withWorkingDocument(
        request
            .execute({ activeScopeId: null, document: state.document })
            .transaction.apply(state.document),
    );
}

function createMoveVertexRequestFromPointer(
    state: EditorState,
    entityRef: Extract<SketchEntityRef, { readonly kind: SketchEntityKind.Vertex }>,
    event: CommandPointerEvent,
): SetFeaturePayloadRequest | null {
    const activeSketch = findActiveSketch(state);

    if (activeSketch?.sketch.id !== entityRef.sketchId) {
        return null;
    }

    const target = projectScreenPointToSketch2({
        camera: state.navigation.camera,
        partStudio: state.document.getActivePartStudio(),
        planeRef: activeSketch.sketch.planeRef,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
    });

    if (!target) {
        return null;
    }

    const sketch = activeSketch.sketch.clone();
    const request = new MoveVertexRequest({
        target,
        vertexId: entityRef.entityId,
    });
    const operation = request.createOperation();

    operation.apply(sketch);

    return createSetSketchPayloadRequest(state, sketch);
}
