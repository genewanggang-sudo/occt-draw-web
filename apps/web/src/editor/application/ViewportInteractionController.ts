import type { BoundingBox3, BoundingSphere, StandardCameraView } from '@occt-draw/renderer';
import type { SceneDocument } from '@occt-draw/scene';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import { EditorController } from './EditorController';
import type { PickService } from './PickService';
import { ViewNavigationController } from './ViewNavigationController';

interface PendingSelectionPointer {
    readonly pointerId: number;
    readonly point: ScreenPoint;
}

interface InteractionContext {
    readonly getActiveCommandId: () => CommandId;
    readonly getScene: () => SceneDocument;
    readonly getSceneBounds: () => BoundingBox3;
    readonly getSceneSphere: () => BoundingSphere;
    readonly getState: () => EditorState;
    readonly pickService: PickService;
    readonly setState: (updater: (current: EditorState) => EditorState) => void;
}

const CLICK_SELECTION_TOLERANCE_PIXELS = 4;
const PICK_THRESHOLD_PIXELS = 9;

export class ViewportInteractionController {
    readonly #context: InteractionContext;
    #pendingSelectionPointer: PendingSelectionPointer | null;

    constructor(context: InteractionContext) {
        this.#context = context;
        this.#pendingSelectionPointer = null;
    }

    activateCommand(commandId: CommandId): void {
        this.#context.setState((current) =>
            new EditorController(current).activateCommand(commandId),
        );
    }

    fitView(): void {
        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).fit(
                this.#context.getSceneBounds(),
                this.#context.getSceneSphere(),
            );

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    handleKeyDown(event: KeyboardEvent): void {
        if (shouldIgnoreShortcut(event)) {
            return;
        }

        if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            this.fitView();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.#context.setState((current) =>
                new EditorController(current).cancelActiveCommand(),
            );
        }
    }

    handlePointerCancel(canvas: HTMLCanvasElement, event: PointerEvent): void {
        this.handlePointerUp(canvas, event);
    }

    handlePointerDown(canvas: HTMLCanvasElement, event: PointerEvent): void {
        const activeCommandId = this.#context.getActiveCommandId();

        if (isSelectionPointer(event, activeCommandId)) {
            const point = getScreenPoint(canvas, event);

            event.preventDefault();
            canvas.setPointerCapture(event.pointerId);
            this.#pendingSelectionPointer = {
                pointerId: event.pointerId,
                point,
            };
            return;
        }

        if (!isViewNavigationPointer(event)) {
            return;
        }

        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);

        const point = getScreenPoint(canvas, event);

        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).begin({
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    handlePointerMove(canvas: HTMLCanvasElement, event: PointerEvent): void {
        const point = getScreenPoint(canvas, event);

        event.preventDefault();
        this.#handleSelectionPointerMove(point, event);

        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).update({
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    handlePointerUp(canvas: HTMLCanvasElement, event: PointerEvent): void {
        event.preventDefault();
        this.#handleSelectionPointerUp(canvas, event);

        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).end(
                event.pointerId,
            );

            return new EditorController(current).applyNavigation(navigation);
        });

        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    }

    handleStandardView(view: StandardCameraView): void {
        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).setStandardView(
                this.#context.getSceneBounds(),
                this.#context.getSceneSphere(),
                view,
            );

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    handleWheel(canvas: HTMLCanvasElement, event: WheelEvent): void {
        const point = getScreenPoint(canvas, event);

        event.preventDefault();

        this.#context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).zoom({
                deltaY: event.deltaY,
                point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    #handleSelectionPointerMove(point: ScreenPoint, event: PointerEvent): void {
        if (!isPreselectionPointer(event, this.#context.getActiveCommandId())) {
            return;
        }

        const currentState = this.#context.getState();
        const target = this.#context.pickService.pickSelectionTarget({
            camera: currentState.navigation.camera,
            point,
            scene: this.#context.getScene(),
            thresholdPixels: PICK_THRESHOLD_PIXELS,
            viewportSize: currentState.navigation.viewportSize,
        });

        this.#context.setState((current) => new EditorController(current).preselectTarget(target));
    }

    #handleSelectionPointerUp(canvas: HTMLCanvasElement, event: PointerEvent): void {
        const pendingSelectionPointer = this.#pendingSelectionPointer;

        if (pendingSelectionPointer?.pointerId !== event.pointerId) {
            return;
        }

        this.#pendingSelectionPointer = null;

        const point = getScreenPoint(canvas, event);

        if (distance2d(point, pendingSelectionPointer.point) > CLICK_SELECTION_TOLERANCE_PIXELS) {
            return;
        }

        const currentState = this.#context.getState();
        const target = this.#context.pickService.pickSelectionTarget({
            camera: currentState.navigation.camera,
            point,
            scene: this.#context.getScene(),
            thresholdPixels: PICK_THRESHOLD_PIXELS,
            viewportSize: currentState.navigation.viewportSize,
        });

        if (!target) {
            this.#context.setState((current) =>
                new EditorController(current).replaceSelection(null),
            );
            return;
        }

        this.#context.setState((current) => new EditorController(current).replaceSelection(target));
    }
}

function isSelectionPointer(event: PointerEvent, activeCommandId: CommandId): boolean {
    return activeCommandId === 'select' && event.button === 0;
}

function isPreselectionPointer(event: PointerEvent, activeCommandId: CommandId): boolean {
    return activeCommandId === 'select' && event.buttons === 0;
}

function isViewNavigationPointer(event: PointerEvent): boolean {
    return event.button === 1 || event.button === 2;
}

function getScreenPoint(canvas: HTMLCanvasElement, event: PointerEvent | WheelEvent): ScreenPoint {
    const bounds = canvas.getBoundingClientRect();

    return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
    };
}

function distance2d(left: ScreenPoint, right: ScreenPoint): number {
    return Math.hypot(left.x - right.x, left.y - right.y);
}

function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return true;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
    );
}
