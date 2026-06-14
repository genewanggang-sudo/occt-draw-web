import type { ScreenPoint } from '@occt-draw/canvas';
import type { ViewportInputModifiers } from './ViewportInput';

interface ViewportRawPointInputEventBase {
    readonly clientPoint: ScreenPoint;
    readonly modifiers: ViewportInputModifiers;
    readonly point: ScreenPoint;
    preventDefault(): void;
}

export interface ViewportRawPointerInputEvent extends ViewportRawPointInputEventBase {
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

export interface ViewportRawWheelInputEvent extends ViewportRawPointInputEventBase {
    readonly deltaMode: number;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly kind: 'wheel';
}

export interface ViewportRawKeyboardInputEvent {
    readonly code: string;
    readonly key: string;
    readonly kind: 'key';
    readonly modifiers: ViewportInputModifiers;
    readonly targetIsTextInput: boolean;
    preventDefault(): void;
}

export interface ViewportRawContextMenuInputEvent {
    readonly clientPoint: ScreenPoint;
    readonly kind: 'context-menu';
    readonly modifiers: ViewportInputModifiers;
    readonly point: ScreenPoint | null;
    preventDefault(): void;
}

export type ViewportRawInputEvent =
    | ViewportRawContextMenuInputEvent
    | ViewportRawKeyboardInputEvent
    | ViewportRawPointerInputEvent
    | ViewportRawWheelInputEvent;

export interface ViewportMouseEvent {
    readonly rawEvent: ViewportRawPointerInputEvent | ViewportRawWheelInputEvent;
    readonly button: number;
    readonly buttons: number;
    readonly clickCount: number;
    readonly clientPoint: ScreenPoint;
    readonly deltaMode?: number;
    readonly deltaX?: number;
    readonly deltaY?: number;
    readonly modifiers: ViewportInputModifiers;
    readonly point: ScreenPoint;
    readonly pointerId: number;
    readonly pointerType: string;
}

export interface ViewportKeyboardEvent {
    readonly rawEvent: ViewportRawKeyboardInputEvent;
    readonly code: string;
    readonly key: string;
    readonly modifiers: ViewportInputModifiers;
    readonly targetIsTextInput: boolean;
}

export interface ViewportEventHandler<TContext = void, TResult = boolean> {
    onClick(event: ViewportMouseEvent, context: TContext): TResult;
    onDoubleClick(event: ViewportMouseEvent, context: TContext): TResult;
    onKeyDown(event: ViewportKeyboardEvent, context: TContext): TResult;
    onLeftDrag(event: ViewportMouseEvent, context: TContext): TResult;
    onLeftDragCancel(event: ViewportMouseEvent, context: TContext): TResult;
    onLeftDragStart(event: ViewportMouseEvent, context: TContext): TResult;
    onLeftDragStop(event: ViewportMouseEvent, context: TContext): TResult;
    onMiddleDrag(event: ViewportMouseEvent, context: TContext): TResult;
    onMiddleDragCancel(event: ViewportMouseEvent, context: TContext): TResult;
    onMiddleDragStart(event: ViewportMouseEvent, context: TContext): TResult;
    onMiddleDragStop(event: ViewportMouseEvent, context: TContext): TResult;
    onPointerDown(event: ViewportMouseEvent, context: TContext): TResult;
    onPointerMove(event: ViewportMouseEvent, context: TContext): TResult;
    onPointerUp(event: ViewportMouseEvent, context: TContext): TResult;
    onRightDrag(event: ViewportMouseEvent, context: TContext): TResult;
    onRightDragCancel(event: ViewportMouseEvent, context: TContext): TResult;
    onRightDragStart(event: ViewportMouseEvent, context: TContext): TResult;
    onRightDragStop(event: ViewportMouseEvent, context: TContext): TResult;
    onWheel(event: ViewportMouseEvent, context: TContext): TResult;
}

export abstract class BaseViewportEventHandler<
    TContext = void,
    TResult = boolean,
> implements ViewportEventHandler<TContext, TResult> {
    protected abstract unhandled(): TResult;

    public onClick(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onDoubleClick(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onKeyDown(_event: ViewportKeyboardEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onLeftDrag(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onLeftDragCancel(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onLeftDragStart(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onLeftDragStop(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onMiddleDrag(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onMiddleDragCancel(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onMiddleDragStart(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onMiddleDragStop(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onPointerDown(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onPointerMove(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onPointerUp(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onRightDrag(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onRightDragCancel(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onRightDragStart(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onRightDragStop(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }

    public onWheel(_event: ViewportMouseEvent, _context: TContext): TResult {
        return this.unhandled();
    }
}
