import { DocumentTransaction, SetFeaturePayloadOperation } from '@occt-draw/core';
import { Measurement } from '@occt-draw/math';
import {
    DeleteSketchEntityRequest,
    findSketchByFeatureId,
    type Sketch,
    type SketchEntityRef,
} from '@occt-draw/sketch';
import type { EditorState } from '../state/editorState';
import { getSketchEntityRefFromSelectionTarget } from '../selection/sketchSelection';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
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
import {
    clearSelection,
    replaceSelection,
    updatePreselection,
} from '../selection/selectionReducer';

interface PendingSelectionPointer {
    readonly pointerId: number;
    readonly point: ScreenPoint;
}

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
                    pendingLineStartVertexId: null,
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

    public override pointerDown(event: CommandPointerEvent): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        this.pendingSelectionPointer = {
            pointerId: event.pointerId,
            point: event.point,
        };

        return createHandledCommandResult();
    }

    public override pointerCancel(): CommandResult {
        this.pendingSelectionPointer = null;
        return createHandledCommandResult();
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
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

        if (
            Measurement.distance2(event.point, pendingSelectionPointer.point).value >
            CLICK_SELECTION_TOLERANCE_PIXELS
        ) {
            return createHandledCommandResult();
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
        const transaction = request.createTransaction();

        transaction.commit(sketch);

        return createHandledCommandResult({
            commandSession: consumeSelectionForCommandSession(
                state.commandSession,
                clearSelection(state.selection).selection,
            ),
            documentEdit: createSetSketchPayloadTransaction(state, sketch),
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
    return ref.kind === 'edge' || ref.kind === 'vertex';
}

function createSetSketchPayloadTransaction(
    state: EditorState,
    sketch: Sketch,
): DocumentTransaction {
    return new DocumentTransaction({
        label: `更新${sketch.name}`,
        operations: [
            new SetFeaturePayloadOperation({
                label: `更新${sketch.name}数据`,
                partStudioId: state.document.getActivePartStudio().id,
                payload: sketch,
                payloadId: sketch.id,
            }),
        ],
    });
}
