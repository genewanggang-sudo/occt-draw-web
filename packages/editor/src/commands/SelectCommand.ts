import type { ScreenPoint } from '../view-navigation/viewNavigation';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { consumeSelectionForCommandSession } from './commandReducer';
import { replaceSelection, updatePreselection } from '../selection/selectionReducer';

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
                    pendingLineStartPointId: null,
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
            distance2d(event.point, pendingSelectionPointer.point) >
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
}

function distance2d(left: ScreenPoint, right: ScreenPoint): number {
    return Math.hypot(left.x - right.x, left.y - right.y);
}
