export interface ViewportInputAdapterHandlers {
    readonly onKeyDown?: (event: KeyboardEvent) => void;
    readonly onContextMenu?: (event: MouseEvent) => void;
    readonly onPointerCancel?: (event: PointerEvent) => void;
    readonly onPointerDown?: (event: PointerEvent) => void;
    readonly onPointerMove?: (event: PointerEvent) => void;
    readonly onPointerUp?: (event: PointerEvent) => void;
    readonly onWheel?: (event: WheelEvent) => void;
}

export class ViewportInputAdapter {
    readonly #handlers: ViewportInputAdapterHandlers;
    #canvas: HTMLCanvasElement | null;

    constructor(handlers: ViewportInputAdapterHandlers) {
        this.#handlers = handlers;
        this.#canvas = null;
    }

    attach(canvas: HTMLCanvasElement): void {
        if (this.#canvas === canvas) {
            return;
        }

        this.detach();
        this.#canvas = canvas;
        canvas.addEventListener('contextmenu', this.#handleContextMenu);
        canvas.addEventListener('pointercancel', this.#handlePointerCancel);
        canvas.addEventListener('pointerdown', this.#handlePointerDown);
        canvas.addEventListener('pointermove', this.#handlePointerMove);
        canvas.addEventListener('pointerup', this.#handlePointerUp);
        canvas.addEventListener('wheel', this.#handleWheel, { passive: false });
        window.addEventListener('keydown', this.#handleKeyDown);
    }

    detach(): void {
        if (!this.#canvas) {
            return;
        }

        this.#canvas.removeEventListener('contextmenu', this.#handleContextMenu);
        this.#canvas.removeEventListener('pointercancel', this.#handlePointerCancel);
        this.#canvas.removeEventListener('pointerdown', this.#handlePointerDown);
        this.#canvas.removeEventListener('pointermove', this.#handlePointerMove);
        this.#canvas.removeEventListener('pointerup', this.#handlePointerUp);
        this.#canvas.removeEventListener('wheel', this.#handleWheel);
        window.removeEventListener('keydown', this.#handleKeyDown);
        this.#canvas = null;
    }

    readonly #handleContextMenu = (event: MouseEvent): void => {
        this.#handlers.onContextMenu?.(event);
    };

    readonly #handleKeyDown = (event: KeyboardEvent): void => {
        this.#handlers.onKeyDown?.(event);
    };

    readonly #handlePointerCancel = (event: PointerEvent): void => {
        this.#handlers.onPointerCancel?.(event);
    };

    readonly #handlePointerDown = (event: PointerEvent): void => {
        this.#handlers.onPointerDown?.(event);
    };

    readonly #handlePointerMove = (event: PointerEvent): void => {
        this.#handlers.onPointerMove?.(event);
    };

    readonly #handlePointerUp = (event: PointerEvent): void => {
        this.#handlers.onPointerUp?.(event);
    };

    readonly #handleWheel = (event: WheelEvent): void => {
        this.#handlers.onWheel?.(event);
    };
}
