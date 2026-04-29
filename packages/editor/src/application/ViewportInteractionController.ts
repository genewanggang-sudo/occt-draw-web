import type { DisplayModel } from '@occt-draw/display';
import {
    getBoundingBoxCorners,
    type BoundingBox3,
    type BoundingSphere,
    type CameraState,
    type NavigationDepthSample,
    type NavigationDepthSampleInput,
    type StandardCameraView,
    type ViewportSize,
} from '@occt-draw/renderer';
import {
    addVector3,
    crossVector3,
    dotVector3,
    lengthVector3,
    normalizeVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
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
const ORBIT_WINDOW_SAMPLE_STEP_PIXELS = 72;
const MIN_WINDOW_DEPTH_SAMPLES = 3;
const BOUNDS_FIT_ROTATE_FACTOR = 2;

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
            displayModel: this.context.getDisplayModel(),
            viewportSize: state.navigation.viewportSize,
        } satisfies Omit<NavigationDepthSampleInput, 'includePlanes'>;
        const modelSamples = this.context.sampleNavigationDepths({
            ...sampleInput,
            includePlanes: false,
        });
        const samples =
            modelSamples.length > 0
                ? modelSamples
                : this.context.sampleNavigationDepths({
                      ...sampleInput,
                      includePlanes: true,
                  });

        const nearest = [...samples].sort((left, right) => {
            const leftDistance = Math.hypot(
                left.canvasPoint.x - point.x,
                left.canvasPoint.y - point.y,
            );
            const rightDistance = Math.hypot(
                right.canvasPoint.x - point.x,
                right.canvasPoint.y - point.y,
            );

            if (Math.abs(leftDistance - rightDistance) > 1e-6) {
                return leftDistance - rightDistance;
            }

            return left.viewDepth - right.viewDepth;
        })[0];

        return nearest?.worldPoint ?? null;
    }

    private getRotateCenterBasedOnWindowDepths(
        state: EditorState,
        includePlanes: boolean,
    ): Vector3 | null {
        const samples = this.context.sampleNavigationDepths({
            area: {
                kind: 'points',
                points: createViewportSamplePoints(
                    state.navigation.viewportSize,
                    ORBIT_WINDOW_SAMPLE_STEP_PIXELS,
                ),
            },
            camera: state.navigation.camera,
            displayModel: this.context.getDisplayModel(),
            includePlanes,
            viewportSize: state.navigation.viewportSize,
        });

        if (samples.length < MIN_WINDOW_DEPTH_SAMPLES) {
            return null;
        }

        return scaleVector3(
            samples.reduce((total, sample) => addVector3(total, sample.worldPoint), {
                x: 0,
                y: 0,
                z: 0,
            }),
            1 / samples.length,
        );
    }

    private getRotateCenterBasedOnBounds(state: EditorState): Vector3 | null {
        const bounds = this.context.getDisplayBounds();

        if (!isFiniteBounds(bounds)) {
            return null;
        }

        const projectedBounds = projectBoundsToViewport(
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

        return fitsReasonableViewport ? getBoundsCenter(bounds) : null;
    }

    private getRotateCenterBasedOnCanvasLocationAndBoundsDepth(
        state: EditorState,
        point: ScreenPoint,
    ): Vector3 | null {
        const bounds = this.context.getDisplayBounds();

        if (!isFiniteBounds(bounds)) {
            return null;
        }

        const ray = screenPointToWorldRay(
            point,
            state.navigation.camera,
            state.navigation.viewportSize,
        );
        const center = getBoundsCenter(bounds);
        const diameter = Math.max(lengthVector3(subtractVector3(bounds.max, bounds.min)), 1);
        const distance = Math.max(
            dotVector3(subtractVector3(center, ray.origin), ray.direction),
            diameter * 0.01,
        );

        return addVector3(ray.origin, scaleVector3(ray.direction, distance));
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
                    zoomAnchor: this.resolveNavigationCenter(current, event.point),
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

interface CameraBasis {
    readonly forward: Vector3;
    readonly right: Vector3;
    readonly up: Vector3;
}

interface ProjectedBounds {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
}

interface WorldRay {
    readonly direction: Vector3;
    readonly origin: Vector3;
}

function getBoundsCenter(bounds: BoundingBox3): Vector3 {
    return scaleVector3(addVector3(bounds.min, bounds.max), 0.5);
}

function createViewportSamplePoints(
    viewportSize: ViewportSize,
    stepPixels: number,
): readonly ScreenPoint[] {
    const points: ScreenPoint[] = [];
    const step = Math.max(stepPixels, 1);

    for (let y = step / 2; y < viewportSize.height; y += step) {
        for (let x = step / 2; x < viewportSize.width; x += step) {
            points.push({
                x,
                y,
            });
        }
    }

    return points;
}

function isFiniteBounds(bounds: BoundingBox3): boolean {
    return (
        Number.isFinite(bounds.min.x) &&
        Number.isFinite(bounds.min.y) &&
        Number.isFinite(bounds.min.z) &&
        Number.isFinite(bounds.max.x) &&
        Number.isFinite(bounds.max.y) &&
        Number.isFinite(bounds.max.z)
    );
}

function projectBoundsToViewport(
    bounds: BoundingBox3,
    camera: CameraState,
    viewportSize: ViewportSize,
): ProjectedBounds {
    const basis = getCameraBasis(camera);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const corner of getBoundingBoxCorners(bounds)) {
        const point = projectWorldToScreen(corner, camera, basis, viewportSize);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    return { maxX, maxY, minX, minY };
}

function projectWorldToScreen(
    point: Vector3,
    camera: CameraState,
    basis: CameraBasis,
    viewportSize: ViewportSize,
): ScreenPoint {
    const relative = subtractVector3(point, camera.target);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const halfHeight = getViewHeight(camera) / 2;
    const halfWidth = halfHeight * aspect;
    const projectedX = dotVector3(relative, basis.right);
    const projectedY = dotVector3(relative, basis.up);

    return {
        x: ((projectedX / halfWidth + 1) / 2) * viewportSize.width,
        y: ((1 - projectedY / halfHeight) / 2) * viewportSize.height,
    };
}

function screenPointToWorldRay(
    point: ScreenPoint,
    camera: CameraState,
    viewportSize: ViewportSize,
): WorldRay {
    const basis = getCameraBasis(camera);
    const height = getViewHeight(camera);
    const width = height * (viewportSize.width / viewportSize.height);
    const x = (point.x / viewportSize.width - 0.5) * width;
    const y = (0.5 - point.y / viewportSize.height) * height;
    const viewPlanePoint = addVector3(
        camera.target,
        addVector3(scaleVector3(basis.right, x), scaleVector3(basis.up, y)),
    );

    if (camera.projection === 'perspective') {
        return {
            direction: normalizeVector3(subtractVector3(viewPlanePoint, camera.position)),
            origin: camera.position,
        };
    }

    return {
        direction: basis.forward,
        origin: subtractVector3(
            viewPlanePoint,
            scaleVector3(
                basis.forward,
                dotVector3(subtractVector3(camera.target, camera.position), basis.forward),
            ),
        ),
    };
}

function getViewHeight(camera: CameraState): number {
    if (camera.projection === 'orthographic') {
        return camera.orthographicHeight;
    }

    const distance = Math.max(
        0.001,
        Math.hypot(
            camera.position.x - camera.target.x,
            camera.position.y - camera.target.y,
            camera.position.z - camera.target.z,
        ),
    );

    return 2 * distance * Math.tan(camera.fovYRadians / 2);
}

function getCameraBasis(camera: CameraState): CameraBasis {
    const forward = normalizeVector3(subtractVector3(camera.target, camera.position));
    const right = normalizeVector3(crossVector3(forward, camera.up));
    const up = normalizeVector3(crossVector3(right, forward));

    return { forward, right, up };
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
