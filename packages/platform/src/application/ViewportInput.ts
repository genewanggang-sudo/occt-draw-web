import type { ScreenPoint } from '@occt-draw/canvas';

export interface ViewportInputModifiers {
    readonly alt: boolean;
    readonly ctrl: boolean;
    readonly meta: boolean;
    readonly shift: boolean;
}

export interface ViewportInputPointEventBase {
    readonly clientPoint: ScreenPoint;
    readonly modifiers: ViewportInputModifiers;
    readonly point: ScreenPoint;
    preventDefault(): void;
}

export interface ViewportPointerInputEvent extends ViewportInputPointEventBase {
    readonly button: number;
    readonly buttons: number;
    readonly clickCount: number;
    readonly isPrimary: boolean;
    readonly kind: 'pointer';
    readonly phase: 'cancel' | 'down' | 'move' | 'up';
    readonly pointerId: number;
    readonly pointerType: string;
    capturePointer(): void;
    releasePointer(): void;
}

export interface ViewportWheelInputEvent extends ViewportInputPointEventBase {
    readonly deltaMode: number;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly kind: 'wheel';
}

export interface ViewportKeyInputEvent {
    readonly code: string;
    readonly key: string;
    readonly kind: 'key';
    readonly modifiers: ViewportInputModifiers;
    readonly phase: 'down';
    readonly targetIsTextInput: boolean;
    preventDefault(): void;
}

export interface ViewportContextMenuInputEvent {
    readonly clientPoint: ScreenPoint;
    readonly kind: 'context-menu';
    readonly modifiers: ViewportInputModifiers;
    readonly point: ScreenPoint | null;
    preventDefault(): void;
}

export type ViewportInputEvent =
    | ViewportContextMenuInputEvent
    | ViewportKeyInputEvent
    | ViewportPointerInputEvent
    | ViewportWheelInputEvent;

export interface ViewportInputOptions {
    readonly onInput: (event: ViewportInputEvent) => void;
}

export abstract class ViewportInputHandler<TContext, TResult> {
    public handleInput(event: ViewportInputEvent, context: TContext): TResult {
        if (event.kind === 'pointer') {
            if (event.phase === 'down') {
                return this.onPointerDown(event, context);
            }

            if (event.phase === 'move') {
                return this.onPointerMove(event, context);
            }

            if (event.phase === 'up') {
                return this.onPointerUp(event, context);
            }

            return this.onPointerCancel(event, context);
        }

        if (event.kind === 'wheel') {
            return this.onWheel(event, context);
        }

        if (event.kind === 'key') {
            return this.onKeyDown(event, context);
        }

        return this.onContextMenu(event, context);
    }

    protected abstract unhandled(): TResult;

    protected onContextMenu(_event: ViewportContextMenuInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onKeyDown(_event: ViewportKeyInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onPointerCancel(_event: ViewportPointerInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onPointerDown(_event: ViewportPointerInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onPointerMove(_event: ViewportPointerInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onPointerUp(_event: ViewportPointerInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    protected onWheel(_event: ViewportWheelInputEvent, _context: TContext): TResult {
        return this.unhandled();
    }
}

export class ViewportInput {
    private canvas: HTMLCanvasElement | null = null;

    constructor(private readonly options: ViewportInputOptions) {}

    public attach(canvas: HTMLCanvasElement): void {
        if (this.canvas === canvas) {
            return;
        }

        this.detach();
        this.canvas = canvas;
        canvas.addEventListener('contextmenu', this.handleContextMenu);
        canvas.addEventListener('pointercancel', this.handlePointerCancel);
        canvas.addEventListener('pointerdown', this.handlePointerDown);
        canvas.addEventListener('pointermove', this.handlePointerMove);
        canvas.addEventListener('pointerup', this.handlePointerUp);
        canvas.addEventListener('wheel', this.handleWheel, { passive: false });
        window.addEventListener('keydown', this.handleKeyDown);
    }

    public detach(): void {
        if (!this.canvas) {
            return;
        }

        this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
        this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        window.removeEventListener('keydown', this.handleKeyDown);
        this.canvas = null;
    }

    private readonly handleContextMenu = (event: MouseEvent): void => {
        this.options.onInput({
            clientPoint: getClientPoint(event),
            kind: 'context-menu',
            modifiers: getModifiers(event),
            point: this.canvas ? getCanvasPoint(this.canvas, event) : null,
            preventDefault: () => {
                event.preventDefault();
            },
        });
    };

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        this.options.onInput({
            code: event.code,
            key: event.key,
            kind: 'key',
            modifiers: getModifiers(event),
            phase: 'down',
            preventDefault: () => {
                event.preventDefault();
            },
            targetIsTextInput: isTextInputTarget(event.target),
        });
    };

    private readonly handlePointerCancel = (event: PointerEvent): void => {
        this.handlePointer(event, 'cancel');
    };

    private readonly handlePointerDown = (event: PointerEvent): void => {
        this.handlePointer(event, 'down');
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        this.handlePointer(event, 'move');
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        this.handlePointer(event, 'up');
    };

    private readonly handleWheel = (event: WheelEvent): void => {
        if (!this.canvas) {
            return;
        }

        this.options.onInput({
            clientPoint: getClientPoint(event),
            deltaMode: event.deltaMode,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            kind: 'wheel',
            modifiers: getModifiers(event),
            point: getCanvasPoint(this.canvas, event),
            preventDefault: () => {
                event.preventDefault();
            },
        });
    };

    private handlePointer(event: PointerEvent, phase: ViewportPointerInputEvent['phase']): void {
        const canvas = this.canvas;

        if (!canvas) {
            return;
        }

        this.options.onInput({
            button: event.button,
            buttons: event.buttons,
            capturePointer: () => {
                canvas.setPointerCapture(event.pointerId);
            },
            clickCount: event.detail,
            clientPoint: getClientPoint(event),
            isPrimary: event.isPrimary,
            kind: 'pointer',
            modifiers: getModifiers(event),
            phase,
            point: getCanvasPoint(canvas, event),
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            preventDefault: () => {
                event.preventDefault();
            },
            releasePointer: () => {
                if (canvas.hasPointerCapture(event.pointerId)) {
                    canvas.releasePointerCapture(event.pointerId);
                }
            },
        });
    }
}

export const ViewportInputAdapter = ViewportInput;

function getCanvasPoint(canvas: HTMLCanvasElement, event: MouseEvent): ScreenPoint {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

function getClientPoint(event: MouseEvent): ScreenPoint {
    return {
        x: event.clientX,
        y: event.clientY,
    };
}

function getModifiers(event: MouseEvent | KeyboardEvent): ViewportInputModifiers {
    return {
        alt: event.altKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
    };
}

function isTextInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
    );
}
