import type { DisplayModel } from '@occt-draw/display';
import type { DocumentTransaction, EditDraft, TransactionGroup } from '@occt-draw/core';
import type { BoundingBox3, BoundingSphere, StandardCameraView } from '@occt-draw/renderer';
import type { CommandContext, CommandPointerEvent } from '../commands/CadCommand';
import { SelectCommand } from '../commands/SelectCommand';
import { SketchCommand } from '../commands/SketchCommand';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import { CommandManager } from './CommandManager';
import { EditorController } from './EditorController';
import type { PickService } from './PickService';
import { ViewNavigationController } from './ViewNavigationController';

interface InteractionContext {
    readonly getActiveCommandId: () => CommandId;
    readonly getDisplayBounds: () => BoundingBox3;
    readonly getDisplayModel: () => DisplayModel;
    readonly getDisplaySphere: () => BoundingSphere;
    readonly getState: () => EditorState;
    readonly pickService: PickService;
    readonly setState: (updater: (current: EditorState) => EditorState) => void;
}

const PICK_THRESHOLD_PIXELS = 9;

export class ViewportInteractionController {
    private readonly commandManager: CommandManager;
    private readonly context: InteractionContext;

    constructor(context: InteractionContext) {
        this.context = context;
        this.commandManager = new CommandManager({
            activeCommandId: context.getActiveCommandId(),
            commands: [new SelectCommand(), new SketchCommand()],
        });
    }

    activateCommand(commandId: CommandId): void {
        const commandContext = this.createCommandContext();

        this.context.setState((current) => {
            const nextState = new EditorController(current).activateCommand(commandId);

            if (
                nextState.commandSession.id === commandId &&
                nextState.commandSession.status !== 'blocked'
            ) {
                this.commandManager.activate(commandId, commandContext);
            }

            return nextState;
        });
    }

    fitView(): void {
        this.context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).fit(
                this.context.getDisplayBounds(),
                this.context.getDisplaySphere(),
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
            this.commandManager.cancel(this.createCommandContext());
            this.commandManager.setActiveCommandId('select');
            this.context.setState((current) => new EditorController(current).cancelActiveCommand());
            return;
        }

        if (this.commandManager.keyDown({ key: event.key }, this.createCommandContext())) {
            event.preventDefault();
        }
    }

    handlePointerCancel(canvas: HTMLCanvasElement, event: PointerEvent): void {
        this.handlePointerUp(canvas, event);
    }

    handlePointerDown(canvas: HTMLCanvasElement, event: PointerEvent): void {
        const point = getScreenPoint(canvas, event);

        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());

        if (
            this.commandManager.pointerDown(
                createCommandPointerEvent(event, point),
                this.createCommandContext(),
            )
        ) {
            event.preventDefault();
            canvas.setPointerCapture(event.pointerId);
            return;
        }

        if (!isViewNavigationPointer(event)) {
            return;
        }

        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);

        this.context.setState((current) => {
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

        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        this.commandManager.pointerMove(
            createCommandPointerEvent(event, point),
            this.createCommandContext(),
        );

        event.preventDefault();

        this.context.setState((current) => {
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
        const point = getScreenPoint(canvas, event);

        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        this.commandManager.pointerUp(
            createCommandPointerEvent(event, point),
            this.createCommandContext(),
        );

        event.preventDefault();

        this.context.setState((current) => {
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
        this.context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).setStandardView(
                this.context.getDisplayBounds(),
                this.context.getDisplaySphere(),
                view,
            );

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    handleWheel(canvas: HTMLCanvasElement, event: WheelEvent): void {
        const point = getScreenPoint(canvas, event);

        event.preventDefault();

        this.context.setState((current) => {
            const navigation = new ViewNavigationController(current.navigation).zoom({
                deltaY: event.deltaY,
                point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    private createCommandContext(): CommandContext {
        return {
            commit: (edit: DocumentTransaction | TransactionGroup) => {
                this.context.setState((current) =>
                    new EditorController(current).applyDocumentEdit(edit),
                );
            },
            getDisplayModel: () => this.context.getDisplayModel(),
            getDraft: () => this.context.getState().draft,
            getState: () => this.context.getState(),
            pick: (point: ScreenPoint) => {
                const state = this.context.getState();

                return this.context.pickService.pickSelectionTarget({
                    camera: state.navigation.camera,
                    displayModel: this.context.getDisplayModel(),
                    point,
                    thresholdPixels: PICK_THRESHOLD_PIXELS,
                    viewportSize: state.navigation.viewportSize,
                });
            },
            replaceDraft: (draft: EditDraft | null) => {
                this.context.setState((current) =>
                    new EditorController(current).replaceDraft(draft),
                );
            },
            setMessage: (message: string) => {
                this.context.setState((current) =>
                    new EditorController(current).updateCommandMessage(message),
                );
            },
            setState: this.context.setState,
        };
    }
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

function createCommandPointerEvent(event: PointerEvent, point: ScreenPoint): CommandPointerEvent {
    return {
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        point,
        pointerId: event.pointerId,
    };
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
