import { EditorController } from '../application/EditorController';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import { CadCommand, type CommandContext, type CommandPointerEvent } from './CadCommand';

interface PendingSelectionPointer {
    readonly pointerId: number;
    readonly point: ScreenPoint;
}

const CLICK_SELECTION_TOLERANCE_PIXELS = 4;

export class SelectCommand extends CadCommand {
    readonly id = 'select';
    private pendingSelectionPointer: PendingSelectionPointer | null = null;

    override enter(context: CommandContext): void {
        context.replaceDraft(null);
    }

    override cancel(context: CommandContext): void {
        this.pendingSelectionPointer = null;
        context.replaceDraft(null);
    }

    override pointerDown(event: CommandPointerEvent): boolean {
        if (event.button !== 0) {
            return false;
        }

        this.pendingSelectionPointer = {
            pointerId: event.pointerId,
            point: event.point,
        };

        return true;
    }

    override pointerMove(event: CommandPointerEvent, context: CommandContext): boolean {
        if (event.buttons !== 0) {
            return false;
        }

        const target = context.pick(event.point);

        context.setState((current) => new EditorController(current).preselectTarget(target));

        return true;
    }

    override pointerUp(event: CommandPointerEvent, context: CommandContext): boolean {
        const pendingSelectionPointer = this.pendingSelectionPointer;

        if (pendingSelectionPointer?.pointerId !== event.pointerId) {
            return false;
        }

        this.pendingSelectionPointer = null;

        if (
            distance2d(event.point, pendingSelectionPointer.point) >
            CLICK_SELECTION_TOLERANCE_PIXELS
        ) {
            return true;
        }

        const target = context.pick(event.point);

        context.setState((current) => new EditorController(current).replaceSelection(target));

        return true;
    }
}

function distance2d(left: ScreenPoint, right: ScreenPoint): number {
    return Math.hypot(left.x - right.x, left.y - right.y);
}
