import type {
    ViewportEvent,
    ViewportEventHandler,
    ViewportKeyboardEvent,
    ViewportMouseEvent,
    ViewportRawInputEvent,
    ViewportRawPointerInputEvent,
} from './ViewportEvents';
import { ViewportInput, type ViewportInputEvent } from './ViewportInput';

export interface ViewportInteractorOptions {
    readonly dragThresholdPixels?: number;
    readonly handlers: readonly ViewportEventHandler[];
}

interface PointerSequenceState {
    readonly button: number;
    readonly pointerId: number;
    readonly startEvent: ViewportMouseEvent;
    readonly startPoint: ViewportMouseEvent['point'];
    isDragging: boolean;
    lastEvent: ViewportMouseEvent;
}

const DEFAULT_DRAG_THRESHOLD_PIXELS = 3;

export class ViewportInteractor {
    private readonly dragThresholdPixels: number;
    private readonly handlers: readonly ViewportEventHandler[];
    private readonly input: ViewportInput;
    private pointerState: PointerSequenceState | null = null;

    constructor(options: ViewportInteractorOptions) {
        this.dragThresholdPixels = options.dragThresholdPixels ?? DEFAULT_DRAG_THRESHOLD_PIXELS;
        this.handlers = options.handlers;
        this.input = new ViewportInput({
            onInput: (event) => {
                this.handleInput(toRawInputEvent(event));
            },
        });
    }

    public attach(canvas: HTMLCanvasElement): void {
        this.input.attach(canvas);
    }

    public detach(): void {
        this.input.detach();
        this.pointerState = null;
    }

    private handleInput(event: ViewportRawInputEvent): void {
        if (event.kind === 'context-menu') {
            event.preventDefault();
            return;
        }

        if (event.kind === 'key') {
            if (this.dispatchKeyDown(toKeyboardEvent(event))) {
                event.preventDefault();
            }
            return;
        }

        if (event.kind === 'wheel') {
            this.dispatchWheel(toWheelEvent(event));
            event.preventDefault();
            return;
        }

        this.handlePointerInput(event);
    }

    private handlePointerInput(event: ViewportRawPointerInputEvent): void {
        const mouseEvent = toPointerMouseEvent(event);

        if (event.phase === 'down') {
            const handled = this.dispatchPointerDown(mouseEvent);
            this.pointerState = {
                button: event.button,
                isDragging: false,
                lastEvent: mouseEvent,
                pointerId: event.pointerId,
                startEvent: mouseEvent,
                startPoint: event.point,
            };

            if (handled) {
                event.capturePointer();
                event.preventDefault();
            }
            return;
        }

        if (event.phase === 'move') {
            const handled = this.handlePointerMove(mouseEvent);

            if (handled) {
                event.preventDefault();
            }
            return;
        }

        if (event.phase === 'up') {
            const handled = this.handlePointerUp(mouseEvent);
            this.releasePointerIfNeeded(event);

            if (handled) {
                event.preventDefault();
            }
            return;
        }

        const handled = this.handlePointerCancel(mouseEvent);
        this.releasePointerIfNeeded(event);

        if (handled) {
            event.preventDefault();
        }
    }

    private handlePointerMove(event: ViewportMouseEvent): boolean {
        const pointerState =
            this.pointerState?.pointerId === event.pointerId ? this.pointerState : null;

        if (!pointerState || event.buttons === 0) {
            return this.dispatchPointerMove(event);
        }

        pointerState.lastEvent = event;

        if (!pointerState.isDragging) {
            if (distance(pointerState.startPoint, event.point) <= this.dragThresholdPixels) {
                return false;
            }

            pointerState.isDragging = true;
            const dragEvent = withButton(event, pointerState.button);
            const startHandled = this.dispatchDragStart(pointerState.button, dragEvent);
            const dragHandled = this.dispatchDrag(pointerState.button, dragEvent);
            return startHandled || dragHandled;
        }

        return this.dispatchDrag(pointerState.button, withButton(event, pointerState.button));
    }

    private handlePointerUp(event: ViewportMouseEvent): boolean {
        const pointerState =
            this.pointerState?.pointerId === event.pointerId ? this.pointerState : null;
        this.pointerState = null;

        if (!pointerState) {
            return this.dispatchPointerUp(event);
        }

        if (pointerState.isDragging) {
            return this.dispatchDragStop(
                pointerState.button,
                withButton(event, pointerState.button),
            );
        }

        const upHandled = this.dispatchPointerUp(event);
        const clickHandled =
            event.clickCount >= 2 ? this.dispatchDoubleClick(event) : this.dispatchClick(event);
        return upHandled || clickHandled;
    }

    private handlePointerCancel(event: ViewportMouseEvent): boolean {
        const pointerState =
            this.pointerState?.pointerId === event.pointerId ? this.pointerState : null;
        this.pointerState = null;

        if (!pointerState?.isDragging) {
            return false;
        }

        return this.dispatchDragCancel(pointerState.button, withButton(event, pointerState.button));
    }

    private releasePointerIfNeeded(event: ViewportRawPointerInputEvent): void {
        event.releasePointer();
    }

    private dispatchClick(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'click' });
    }

    private dispatchDoubleClick(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'doubleClick' });
    }

    private dispatchKeyDown(event: ViewportKeyboardEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'keyDown' });
    }

    private dispatchPointerDown(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'pointerDown' });
    }

    private dispatchPointerMove(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'pointerMove' });
    }

    private dispatchPointerUp(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'pointerUp' });
    }

    private dispatchWheel(event: ViewportMouseEvent): boolean {
        return dispatch(this.handlers, { ...event, type: 'wheel' });
    }

    private dispatchDragStart(button: number, event: ViewportMouseEvent): boolean {
        if (button === 0) {
            return dispatch(this.handlers, { ...event, type: 'leftDragStart' });
        }

        if (button === 1) {
            return dispatch(this.handlers, { ...event, type: 'middleDragStart' });
        }

        if (button === 2) {
            return dispatch(this.handlers, { ...event, type: 'rightDragStart' });
        }

        return false;
    }

    private dispatchDrag(button: number, event: ViewportMouseEvent): boolean {
        if (button === 0) {
            return dispatch(this.handlers, { ...event, type: 'leftDrag' });
        }

        if (button === 1) {
            return dispatch(this.handlers, { ...event, type: 'middleDrag' });
        }

        if (button === 2) {
            return dispatch(this.handlers, { ...event, type: 'rightDrag' });
        }

        return false;
    }

    private dispatchDragStop(button: number, event: ViewportMouseEvent): boolean {
        if (button === 0) {
            return dispatch(this.handlers, { ...event, type: 'leftDragStop' });
        }

        if (button === 1) {
            return dispatch(this.handlers, { ...event, type: 'middleDragStop' });
        }

        if (button === 2) {
            return dispatch(this.handlers, { ...event, type: 'rightDragStop' });
        }

        return false;
    }

    private dispatchDragCancel(button: number, event: ViewportMouseEvent): boolean {
        if (button === 0) {
            return dispatch(this.handlers, { ...event, type: 'leftDragCancel' });
        }

        if (button === 1) {
            return dispatch(this.handlers, { ...event, type: 'middleDragCancel' });
        }

        if (button === 2) {
            return dispatch(this.handlers, { ...event, type: 'rightDragCancel' });
        }

        return false;
    }
}

function dispatch(handlers: readonly ViewportEventHandler[], event: ViewportEvent): boolean {
    for (const handler of handlers) {
        if (handler.handleEvent(event, undefined)) {
            return true;
        }
    }

    return false;
}

function toKeyboardEvent(
    event: Extract<ViewportRawInputEvent, { readonly kind: 'key' }>,
): ViewportKeyboardEvent {
    return {
        code: event.code,
        key: event.key,
        modifiers: event.modifiers,
        rawEvent: event,
        targetIsTextInput: event.targetIsTextInput,
    };
}

function toPointerMouseEvent(event: ViewportRawPointerInputEvent): ViewportMouseEvent {
    return {
        button: event.button,
        buttons: event.buttons,
        clickCount: event.clickCount,
        clientPoint: event.clientPoint,
        modifiers: event.modifiers,
        point: event.point,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        rawEvent: event,
    };
}

function toWheelEvent(
    event: Extract<ViewportRawInputEvent, { readonly kind: 'wheel' }>,
): ViewportMouseEvent {
    return {
        button: -1,
        buttons: 0,
        clickCount: 0,
        clientPoint: event.clientPoint,
        deltaMode: event.deltaMode,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        modifiers: event.modifiers,
        point: event.point,
        pointerId: -1,
        pointerType: 'wheel',
        rawEvent: event,
    };
}

function distance(first: ViewportMouseEvent['point'], second: ViewportMouseEvent['point']): number {
    const dx = second.x - first.x;
    const dy = second.y - first.y;

    return Math.hypot(dx, dy);
}

function withButton(event: ViewportMouseEvent, button: number): ViewportMouseEvent {
    if (event.button === button) {
        return event;
    }

    return {
        ...event,
        button,
    };
}

function toRawInputEvent(event: ViewportInputEvent): ViewportRawInputEvent {
    if (event.kind === 'context-menu') {
        return {
            clientPoint: event.clientPoint,
            kind: event.kind,
            modifiers: event.modifiers,
            point: event.point,
            preventDefault: () => {
                event.preventDefault();
            },
        };
    }

    if (event.kind === 'key') {
        return {
            code: event.code,
            key: event.key,
            kind: event.kind,
            modifiers: event.modifiers,
            preventDefault: () => {
                event.preventDefault();
            },
            targetIsTextInput: event.targetIsTextInput,
        };
    }

    if (event.kind === 'wheel') {
        return {
            clientPoint: event.clientPoint,
            deltaMode: event.deltaMode,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            kind: event.kind,
            modifiers: event.modifiers,
            point: event.point,
            preventDefault: () => {
                event.preventDefault();
            },
        };
    }

    return {
        button: event.button,
        buttons: event.buttons,
        capturePointer: () => {
            event.capturePointer();
        },
        clickCount: event.clickCount,
        clientPoint: event.clientPoint,
        isPrimary: event.isPrimary,
        kind: event.kind,
        modifiers: event.modifiers,
        phase: event.phase,
        point: event.point,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        preventDefault: () => {
            event.preventDefault();
        },
        releasePointer: () => {
            event.releasePointer();
        },
    };
}
