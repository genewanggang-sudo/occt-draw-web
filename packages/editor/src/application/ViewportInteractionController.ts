import {
    projectBoundsToScreenRect,
    screenPointToWorldRay,
    type BoundingBox3,
    type BoundingSphere,
    type NavigationDepthGraphSampleInput,
    type NavigationDepthSample,
    type NavigationDepthSampleInput,
    type RenderGraph,
    type StandardCameraView,
} from '@occt-draw/canvas';
import {
    BBox3,
    DEFAULT_TOLERANCE,
    Measurement,
    Projection,
    Vec3,
    type Vector3,
} from '@occt-draw/math';
import {
    CommandManager,
    ViewNavigationController,
    type PickService,
    type ScreenPoint,
} from '@occt-draw/platform';
import {
    mergeCommandResults,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandKeyEvent,
    type CommandPointerEvent,
    type CommandResult,
} from '../commands/CadCommand';
import { SelectCommand } from '../commands/SelectCommand';
import { EnterSketchCommand } from '../commands/EnterSketchCommand';
import { SketchCircleCommand } from '../commands/SketchCircleCommand';
import { SketchLineCommand } from '../commands/SketchLineCommand';
import { SketchRectangleCommand } from '../commands/SketchRectangleCommand';
import type { CommandId } from '../commands/commandTypes';
import type { EditorState } from '../state/editorState';
import { EditorController } from './EditorController';

export interface ViewportInteractionContext {
    readonly getActiveCommandId: () => CommandId;
    readonly getDisplayBounds: () => BoundingBox3;
    readonly getRenderGraph: () => RenderGraph;
    readonly getDisplaySphere: () => BoundingSphere;
    readonly getState: () => EditorState;
    readonly pickService: PickService;
    readonly sampleNavigationDepths: (
        input: NavigationDepthSampleInput,
    ) => readonly NavigationDepthSample[];
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
const ORBIT_UNDER_POINTER_RADIUS_PIXELS = 12;
const ORBIT_WINDOW_TARGET_SAMPLE_COUNT = 2000;
const MIN_WINDOW_DEPTH_SAMPLES = 3;
const BOUNDS_FIT_ROTATE_FACTOR = 2;

export class ViewportInteractionController {
    private readonly commandManager: CommandManager<
        CommandId,
        CommandContext,
        CommandResult,
        CommandPointerEvent,
        CommandKeyEvent,
        | SelectCommand
        | EnterSketchCommand
        | SketchLineCommand
        | SketchRectangleCommand
        | SketchCircleCommand
    >;
    private readonly context: ViewportInteractionContext;

    constructor(context: ViewportInteractionContext) {
        this.context = context;
        this.commandManager = new CommandManager({
            activeCommandId: context.getActiveCommandId(),
            commands: [
                new SelectCommand(),
                new EnterSketchCommand(),
                new SketchLineCommand(),
                new SketchRectangleCommand(),
                new SketchCircleCommand(),
            ],
            createUnhandledResult: createUnhandledCommandResult,
            mergeResults: mergeCommandResults,
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
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());

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
                orbitPivot: this.resolveNavigationCenter(current, event.point),
                pointerId: event.pointerId,
                point: event.point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
        return true;
    }

    private resolveNavigationCenter(state: EditorState, point: ScreenPoint): Vector3 {
        return (
            this.getRotateCenterUnderPoint(state, point) ??
            this.getRotateCenterBasedOnWindowDepths(state, false) ??
            this.getRotateCenterBasedOnWindowDepths(state, true) ??
            this.getRotateCenterBasedOnBounds(state) ??
            this.getRotateCenterBasedOnCanvasLocationAndBoundsDepth(state, point) ??
            state.navigation.camera.target
        );
    }

    private getRotateCenterUnderPoint(state: EditorState, point: ScreenPoint): Vector3 | null {
        const radius = ORBIT_UNDER_POINTER_RADIUS_PIXELS;
        const sampleInput = {
            area: {
                kind: 'rect',
                rect: {
                    maxX: point.x + radius,
                    maxY: point.y + radius,
                    minX: point.x - radius,
                    minY: point.y - radius,
                },
                stepPixels: 1,
            },
            camera: state.navigation.camera,
            graph: this.context.getRenderGraph(),
            viewportSize: state.navigation.viewportSize,
        } satisfies Omit<NavigationDepthGraphSampleInput, 'includeSecondary'>;
        const modelSamples = this.context.sampleNavigationDepths({
            ...sampleInput,
            includeSecondary: false,
        });
        const samples =
            modelSamples.length > 0
                ? modelSamples
                : this.context.sampleNavigationDepths({
                      ...sampleInput,
                      includeSecondary: true,
                  });

        const nearest = [...samples].sort((left, right) => {
            const leftDistance = Measurement.distance2(left.canvasPoint, point).value;
            const rightDistance = Measurement.distance2(right.canvasPoint, point).value;

            if (Math.abs(leftDistance - rightDistance) > DEFAULT_TOLERANCE.distance) {
                return leftDistance - rightDistance;
            }

            return left.viewDepth - right.viewDepth;
        })[0];

        return nearest?.worldPoint ?? null;
    }

    private getRotateCenterBasedOnWindowDepths(
        state: EditorState,
        includeSecondary: boolean,
    ): Vector3 | null {
        const samples = this.context.sampleNavigationDepths({
            area: {
                kind: 'viewport-grid',
                targetSampleCount: ORBIT_WINDOW_TARGET_SAMPLE_COUNT,
            },
            camera: state.navigation.camera,
            graph: this.context.getRenderGraph(),
            includeSecondary,
            viewportSize: state.navigation.viewportSize,
        });

        if (samples.length < MIN_WINDOW_DEPTH_SAMPLES) {
            return null;
        }

        return Vec3.scale(
            samples.reduce((total, sample) => Vec3.add(total, sample.worldPoint), {
                x: 0,
                y: 0,
                z: 0,
            }),
            1 / samples.length,
        );
    }

    private getRotateCenterBasedOnBounds(state: EditorState): Vector3 | null {
        const bounds = this.context.getDisplayBounds();
        const bbox = BBox3.fromBoundsLike(bounds);

        if (!bbox.isFinite()) {
            return null;
        }

        const projectedBounds = projectBoundsToScreenRect(
            bounds,
            state.navigation.camera,
            state.navigation.viewportSize,
        );
        const width = projectedBounds.maxX - projectedBounds.minX;
        const height = projectedBounds.maxY - projectedBounds.minY;
        const viewport = state.navigation.viewportSize;
        const fitsReasonableViewport =
            width <= viewport.width * BOUNDS_FIT_ROTATE_FACTOR &&
            height <= viewport.height * BOUNDS_FIT_ROTATE_FACTOR &&
            projectedBounds.maxX >= 0 &&
            projectedBounds.minX <= viewport.width &&
            projectedBounds.maxY >= 0 &&
            projectedBounds.minY <= viewport.height;

        return fitsReasonableViewport ? bbox.center : null;
    }

    private getRotateCenterBasedOnCanvasLocationAndBoundsDepth(
        state: EditorState,
        point: ScreenPoint,
    ): Vector3 | null {
        const bounds = this.context.getDisplayBounds();
        const bbox = BBox3.fromBoundsLike(bounds);

        if (!bbox.isFinite()) {
            return null;
        }

        const ray = screenPointToWorldRay(
            point,
            state.navigation.camera,
            state.navigation.viewportSize,
        );
        const diameter = Math.max(Measurement.boundsDiameter3(bbox).value, 1);
        const projection = Projection.pointToRayParameter3(bbox.center, ray);
        const projectedCenterDistance = projection.success ? projection.value : null;
        const distance = Math.max(projectedCenterDistance ?? diameter * 0.01, diameter * 0.01);

        return ray.pointAt(distance);
    }

    public handlePointerMove(event: EditorPointerInput): boolean {
        this.commandManager.setActiveCommandId(this.context.getActiveCommandId());
        const commandResult = this.commandManager.pointerMove(event, this.createCommandContext());
        this.applyCommandResult(commandResult);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).update(
                {
                    button: event.button,
                    ctrlKey: event.ctrlKey,
                    pointerId: event.pointerId,
                    point: event.point,
                },
                this.context.getDisplayBounds(),
            );

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
            const navigation = new ViewNavigationController(current.navigation).zoom(
                {
                    deltaY: event.deltaY,
                    point: event.point,
                    zoomAnchor: current.navigation.camera.target,
                },
                this.context.getDisplayBounds(),
            );

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
            getDraft: () => (stateOverride ?? this.context.getState()).draft,
            getState: () => stateOverride ?? this.context.getState(),
            pick: (point: ScreenPoint) => {
                const state = stateOverride ?? this.context.getState();

                return this.context.pickService.pickSelectionTarget({
                    camera: state.navigation.camera,
                    graph: this.context.getRenderGraph(),
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
