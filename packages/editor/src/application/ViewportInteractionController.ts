import type { DisplayModel } from '@occt-draw/display';
import type { BoundingBox3, BoundingSphere, StandardCameraView } from '@occt-draw/renderer';
import type { CommandContext, CommandPointerEvent, CommandResult } from '../commands/CadCommand';
import { SelectCommand } from '../commands/SelectCommand';
import { SketchCommand } from '../commands/SketchCommand';
import { SketchLineCommand } from '../commands/SketchLineCommand';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import type { ScreenPoint } from '../view-navigation/viewNavigation';
import { CommandManager } from './CommandManager';
import { EditorController } from './EditorController';
import type { PickService } from './PickService';
import { ViewNavigationController } from './ViewNavigationController';

export interface ViewportInteractionContext {
    readonly getActiveCommandId: () => CommandId;
    readonly getDisplayBounds: () => BoundingBox3;
    readonly getDisplayModel: () => DisplayModel;
    readonly getDisplaySphere: () => BoundingSphere;
    readonly getState: () => EditorState;
    readonly pickService: PickService;
    readonly updateState: (updater: (current: EditorState) => EditorState) => void;
}

export interface EditorKeyInput {
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly key: string;
    readonly metaKey: boolean;
    readonly targetIsTextInput: boolean;
}

export type EditorPointerInput = CommandPointerEvent;

export interface EditorWheelInput {
    readonly deltaY: number;
    readonly point: ScreenPoint;
}

const PICK_THRESHOLD_PIXELS = 9;

export class ViewportInteractionController {
    private readonly commandManager: CommandManager;
    private readonly context: ViewportInteractionContext;

    constructor(context: ViewportInteractionContext) {
        this.context = context;
        this.commandManager = new CommandManager({
            activeCommandId: context.getActiveCommandId(),
            commands: [new SelectCommand(), new SketchCommand(), new SketchLineCommand()],
        });
    }

    public activateCommand(commandId: CommandId): void {
        this.context.updateState((current) => {
            const nextState = new EditorController(current).activateCommand(commandId);

            if (
                nextState.commandSession.id === commandId &&
                nextState.commandSession.status !== 'blocked'
            ) {
                const result = this.commandManager.activate(
                    commandId,
                    this.createCommandContext(nextState),
                );

                return new EditorController(nextState).applyCommandResult(result);
            }

            return nextState;
        });
    }

    public fitView(): void {
        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).fit(
                this.context.getDisplayBounds(),
                this.context.getDisplaySphere(),
            );

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    public handleKeyDown(event: EditorKeyInput): boolean {
        if (shouldIgnoreShortcut(event)) {
            return false;
        }

        if (event.key === 'f' || event.key === 'F') {
            this.fitView();
            return true;
        }

        if (event.key === 'Escape') {
            this.context.updateState((current) => {
                const cancelResult = this.commandManager.cancel(this.createCommandContext(current));

                if (cancelResult.handled) {
                    return new EditorController(current).applyCommandResult(cancelResult);
                }

                return new EditorController(current).resetToSelectCommand();
            });
            return true;
        }

        const result = this.commandManager.keyDown({ key: event.key }, this.createCommandContext());
        this.applyCommandResult(result);
        return result.handled;
    }

    public handlePointerCancel(event: EditorPointerInput): boolean {
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        const commandResult = this.commandManager.pointerCancel(event, this.createCommandContext());
        this.applyCommandResult(commandResult);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).end(
                event.pointerId,
            );

            if (navigation === current.navigation) {
                return current;
            }

            return new EditorController(current).applyNavigation(navigation);
        });
        return commandResult.handled || this.context.getState().navigation.drag !== null;
    }

    public handlePointerDown(event: EditorPointerInput): boolean {
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());

        const commandResult = this.commandManager.pointerDown(event, this.createCommandContext());
        this.applyCommandResult(commandResult);

        if (commandResult.handled) {
            return true;
        }

        if (!isViewNavigationPointer(event)) {
            return false;
        }

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).begin({
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point: event.point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
        return true;
    }

    public handlePointerMove(event: EditorPointerInput): boolean {
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        const commandResult = this.commandManager.pointerMove(event, this.createCommandContext());
        this.applyCommandResult(commandResult);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).update({
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point: event.point,
            });

            if (navigation === current.navigation) {
                return current;
            }

            return new EditorController(current).applyNavigation(navigation);
        });
        return commandResult.handled || this.context.getState().navigation.drag !== null;
    }

    public handlePointerUp(event: EditorPointerInput): boolean {
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        const commandResult = this.commandManager.pointerUp(event, this.createCommandContext());
        this.applyCommandResult(commandResult);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).end(
                event.pointerId,
            );

            if (navigation === current.navigation) {
                return current;
            }

            return new EditorController(current).applyNavigation(navigation);
        });
        return commandResult.handled || this.context.getState().navigation.drag !== null;
    }

    public handleStandardView(view: StandardCameraView): void {
        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).setStandardView(
                this.context.getDisplayBounds(),
                this.context.getDisplaySphere(),
                view,
            );

            return new EditorController(current).applyNavigation(navigation);
        });
    }

    public handleWheel(event: EditorWheelInput): boolean {
        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).zoom({
                deltaY: event.deltaY,
                point: event.point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
        return true;
    }

    private applyCommandResult(result: CommandResult): void {
        if (!result.handled) {
            return;
        }

        this.context.updateState((current) =>
            new EditorController(current).applyCommandResult(result),
        );
    }

    private createCommandContext(stateOverride?: EditorState): CommandContext {
        return {
            getDisplayModel: () => this.context.getDisplayModel(),
            getDraft: () => (stateOverride ?? this.context.getState()).draft,
            getState: () => stateOverride ?? this.context.getState(),
            pick: (point: ScreenPoint) => {
                const state = stateOverride ?? this.context.getState();

                return this.context.pickService.pickSelectionTarget({
                    camera: state.navigation.camera,
                    displayModel: this.context.getDisplayModel(),
                    point,
                    thresholdPixels: PICK_THRESHOLD_PIXELS,
                    viewportSize: state.navigation.viewportSize,
                });
            },
        };
    }
}

function isViewNavigationPointer(event: EditorPointerInput): boolean {
    return event.button === 1 || event.button === 2;
}

function shouldIgnoreShortcut(event: EditorKeyInput): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return true;
    }

    return event.targetIsTextInput;
}
