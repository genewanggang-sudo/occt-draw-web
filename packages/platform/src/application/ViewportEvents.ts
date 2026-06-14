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

export type ViewportEvent =
    | (ViewportMouseEvent & { readonly type: 'click' })
    | (ViewportMouseEvent & { readonly type: 'doubleClick' })
    | (ViewportKeyboardEvent & { readonly type: 'keyDown' })
    | (ViewportMouseEvent & { readonly type: 'leftDrag' })
    | (ViewportMouseEvent & { readonly type: 'leftDragCancel' })
    | (ViewportMouseEvent & { readonly type: 'leftDragStart' })
    | (ViewportMouseEvent & { readonly type: 'leftDragStop' })
    | (ViewportMouseEvent & { readonly type: 'middleDrag' })
    | (ViewportMouseEvent & { readonly type: 'middleDragCancel' })
    | (ViewportMouseEvent & { readonly type: 'middleDragStart' })
    | (ViewportMouseEvent & { readonly type: 'middleDragStop' })
    | (ViewportMouseEvent & { readonly type: 'pointerDown' })
    | (ViewportMouseEvent & { readonly type: 'pointerMove' })
    | (ViewportMouseEvent & { readonly type: 'pointerUp' })
    | (ViewportMouseEvent & { readonly type: 'rightDrag' })
    | (ViewportMouseEvent & { readonly type: 'rightDragCancel' })
    | (ViewportMouseEvent & { readonly type: 'rightDragStart' })
    | (ViewportMouseEvent & { readonly type: 'rightDragStop' })
    | (ViewportMouseEvent & { readonly type: 'wheel' });

export interface ViewportEventHandler<TContext = void, TResult = boolean> {
    handleEvent(event: ViewportEvent, context: TContext): TResult;
}

export abstract class BaseViewportEventHandler<
    TContext = void,
    TResult = boolean,
> implements ViewportEventHandler<TContext, TResult> {
    protected abstract unhandled(): TResult;

    public handleEvent(event: ViewportEvent, context: TContext): TResult {
        switch (event.type) {
            case 'click':
                return this.onClick(event, context);
            case 'doubleClick':
                return this.onDoubleClick(event, context);
            case 'keyDown':
                return this.onKeyDown(event, context);
            case 'leftDrag':
                return this.onLeftDrag(event, context);
            case 'leftDragCancel':
                return this.onLeftDragCancel(event, context);
            case 'leftDragStart':
                return this.onLeftDragStart(event, context);
            case 'leftDragStop':
                return this.onLeftDragStop(event, context);
            case 'middleDrag':
                return this.onMiddleDrag(event, context);
            case 'middleDragCancel':
                return this.onMiddleDragCancel(event, context);
            case 'middleDragStart':
                return this.onMiddleDragStart(event, context);
            case 'middleDragStop':
                return this.onMiddleDragStop(event, context);
            case 'pointerDown':
                return this.onPointerDown(event, context);
            case 'pointerMove':
                return this.onPointerMove(event, context);
            case 'pointerUp':
                return this.onPointerUp(event, context);
            case 'rightDrag':
                return this.onRightDrag(event, context);
            case 'rightDragCancel':
                return this.onRightDragCancel(event, context);
            case 'rightDragStart':
                return this.onRightDragStart(event, context);
            case 'rightDragStop':
                return this.onRightDragStop(event, context);
            case 'wheel':
                return this.onWheel(event, context);
        }
    }

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
