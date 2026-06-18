import {
    calculateBoundingSphere,
    createStandardCameraState,
    type RenderGraph,
    type StandardCameraView,
} from '@occt-draw/canvas';
import { createDefaultCadDocument } from '@occt-draw/cad-model';
import { CommandManager, createViewNavigationState, type ScreenPoint } from '@occt-draw/platform';
import {
    createUnhandledCommandResult,
    mergeCommandResults,
    type CommandContext,
    type CommandResult,
} from '../commands/CadCommand';
import { EnterSketchCommand } from '../commands/EnterSketchCommand';
import { SelectCommand } from '../commands/SelectCommand';
import { SketchAlignedRectangleCommand } from '../commands/SketchAlignedRectangleCommand';
import { SketchCenterPointArcCommand } from '../commands/SketchCenterPointArcCommand';
import { SketchCenterRectangleCommand } from '../commands/SketchCenterRectangleCommand';
import { SketchCircleCommand } from '../commands/SketchCircleCommand';
import { SketchConicCommand } from '../commands/SketchConicCommand';
import { SketchEllipseCommand } from '../commands/SketchEllipseCommand';
import { SketchEllipticalArcCommand } from '../commands/SketchEllipticalArcCommand';
import { SketchLineCommand } from '../commands/SketchLineCommand';
import { SketchMidpointLineCommand } from '../commands/SketchMidpointLineCommand';
import { SketchPointCommand } from '../commands/SketchPointCommand';
import { SketchRectangleCommand } from '../commands/SketchRectangleCommand';
import { SketchRegularPolygonCommand } from '../commands/SketchRegularPolygonCommand';
import { SketchSplineCommand } from '../commands/SketchSplineCommand';
import { SketchTangentArcCommand } from '../commands/SketchTangentArcCommand';
import { SketchThreePointArcCommand } from '../commands/SketchThreePointArcCommand';
import { SketchThreePointCircleCommand } from '../commands/SketchThreePointCircleCommand';
import type { CommandId } from '../commands/commandTypes';
import { createInitialEditorState } from '../state/createInitialEditorState';
import type { EditorState } from '../state/editorState';
import { EditorController } from './EditorController';
import { EditorViewport, type EditorViewportStatus } from './EditorViewport';
import { isCancelCommandInput } from './ViewportControllers';
import { createEditorRenderGraph } from './editorRendering';

export interface ApplicationOptions {
    readonly getState: () => EditorState;
    readonly updateState: (updater: (current: EditorState) => EditorState) => void;
}

export interface ApplicationViewportOptions {
    readonly hostElement: HTMLElement;
    readonly onStatusChange?: (status: EditorViewportStatus) => void;
}

export interface CreateDefaultEditorStateOptions {
    readonly viewportSize?: {
        readonly height: number;
        readonly width: number;
    };
}

const INITIAL_VIEWPORT_SIZE = { width: 1, height: 1 } as const;
const PICK_THRESHOLD_PIXELS = 9;

type EditorCommand =
    | SelectCommand
    | EnterSketchCommand
    | SketchLineCommand
    | SketchMidpointLineCommand
    | SketchPointCommand
    | SketchSplineCommand
    | SketchRectangleCommand
    | SketchCenterRectangleCommand
    | SketchAlignedRectangleCommand
    | SketchCenterPointArcCommand
    | SketchCircleCommand
    | SketchThreePointArcCommand
    | SketchTangentArcCommand
    | SketchThreePointCircleCommand
    | SketchEllipseCommand
    | SketchEllipticalArcCommand
    | SketchRegularPolygonCommand
    | SketchConicCommand;

export class Application {
    public readonly commandManager: CommandManager<
        CommandId,
        CommandContext,
        CommandResult,
        EditorCommand
    >;

    private readonly getState: () => EditorState;
    private readonly updateState: (updater: (current: EditorState) => EditorState) => void;
    private mainViewport: EditorViewport | null = null;

    constructor(options: ApplicationOptions) {
        this.getState = options.getState;
        this.updateState = options.updateState;
        this.commandManager = new CommandManager({
            activeCommandId: this.getState().commandSession.id,
            applyResult: (result) => this.applyCommandResult(result),
            commands: [
                new SelectCommand(),
                new EnterSketchCommand(),
                new SketchLineCommand(),
                new SketchMidpointLineCommand(),
                new SketchPointCommand(),
                new SketchSplineCommand(),
                new SketchRectangleCommand(),
                new SketchCenterRectangleCommand(),
                new SketchAlignedRectangleCommand(),
                new SketchCenterPointArcCommand(),
                new SketchCircleCommand(),
                new SketchRegularPolygonCommand({
                    id: 'sketch-inscribed-polygon',
                    mode: 'inscribed',
                    toolKind: 'inscribed-polygon',
                }),
                new SketchRegularPolygonCommand({
                    id: 'sketch-circumscribed-polygon',
                    mode: 'circumscribed',
                    toolKind: 'circumscribed-polygon',
                }),
                new SketchThreePointArcCommand(),
                new SketchTangentArcCommand(),
                new SketchThreePointCircleCommand(),
                new SketchEllipseCommand(),
                new SketchEllipticalArcCommand(),
                new SketchConicCommand(),
            ],
            createUnhandledResult: createUnhandledCommandResult,
            getActiveCommandId: () => this.getState().commandSession.id,
            getContext: () => this.createCommandContext(),
            isCancelInput: isCancelCommandInput,
            mergeResults: mergeCommandResults,
        });
    }

    public activateCommand(commandId: CommandId): void {
        this.updateState((current) => {
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

            this.commandManager.setActiveCommandId(nextState.commandSession.id);
            return nextState;
        });
    }

    public dispose(): void {
        this.mainViewport?.dispose();
        this.mainViewport = null;
    }

    public fitView(): void {
        this.mainViewport?.fitView();
    }

    public initCanvas(options: ApplicationViewportOptions): void {
        this.dispose();
        this.mainViewport = new EditorViewport({
            commandManager: this.commandManager,
            getState: this.getState,
            hostElement: options.hostElement,
            updateState: this.updateState,
            ...(options.onStatusChange ? { onStatusChange: options.onStatusChange } : {}),
        });
    }

    public setStandardView(view: StandardCameraView): void {
        this.mainViewport?.setStandardView(view);
    }

    public syncViewport(): void {
        this.mainViewport?.sync();
    }

    private applyCommandResult(result: CommandResult): boolean {
        if (!result.handled) {
            return false;
        }

        this.updateState((current) => new EditorController(current).applyCommandResult(result));
        return true;
    }

    private createCommandContext(stateOverride?: EditorState): CommandContext {
        return {
            getDraft: () => (stateOverride ?? this.getState()).draft,
            getState: () => stateOverride ?? this.getState(),
            pick: (point: ScreenPoint) => this.pick(point, stateOverride),
        };
    }

    private pick(point: ScreenPoint, stateOverride?: EditorState) {
        const state = stateOverride ?? this.getState();

        return (
            this.mainViewport?.pickSelectionTarget({
                camera: state.navigation.camera,
                point,
                thresholdPixels: PICK_THRESHOLD_PIXELS,
                viewportSize: state.navigation.viewportSize,
            }) ?? null
        );
    }
}

export function createDefaultEditorState(
    options: CreateDefaultEditorStateOptions = {},
): EditorState {
    const document = createDefaultCadDocument();
    const graph = createEditorRenderGraphForDocument(document);
    const displayBounds = graph.navigationBounds;
    const displaySphere = calculateBoundingSphere(displayBounds);
    const camera = createStandardCameraState(
        displayBounds,
        'trimetric',
        options.viewportSize ?? INITIAL_VIEWPORT_SIZE,
    );
    const navigation = createViewNavigationState(
        camera,
        displaySphere,
        options.viewportSize ?? INITIAL_VIEWPORT_SIZE,
    );

    return createInitialEditorState({
        document,
        navigation,
    });
}

function createEditorRenderGraphForDocument(document: EditorState['document']): RenderGraph {
    return createEditorRenderGraph(
        createInitialEditorState({
            document,
            navigation: createViewNavigationState(
                createStandardCameraState(
                    { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
                    'trimetric',
                    INITIAL_VIEWPORT_SIZE,
                ),
                { center: { x: 0, y: 0, z: 0 }, radius: 1 },
                INITIAL_VIEWPORT_SIZE,
            ),
        }),
    );
}
