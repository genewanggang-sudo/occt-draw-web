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
    BaseViewportEventHandler,
    ViewNavigationController,
    type ViewportKeyboardEvent,
    type ViewportMouseEvent,
} from '@occt-draw/platform';
import type { EditorState } from '../state/editorState';
import { EditorController } from './EditorController';

export interface ViewportControllerContext {
    readonly getDisplayBounds: () => BoundingBox3;
    readonly getDisplaySphere: () => BoundingSphere;
    readonly getRenderGraph: () => RenderGraph;
    readonly getState: () => EditorState;
    readonly sampleNavigationDepths: (
        input: NavigationDepthSampleInput,
    ) => readonly NavigationDepthSample[];
    readonly updateState: (updater: (current: EditorState) => EditorState) => void;
}

export type EditorKeyInput = ViewportKeyboardEvent;

export type EditorPointerInput = ViewportMouseEvent;

export type EditorWheelInput = ViewportMouseEvent;

const ORBIT_UNDER_POINTER_RADIUS_PIXELS = 12;
const ORBIT_WINDOW_TARGET_SAMPLE_COUNT = 2000;
const MIN_WINDOW_DEPTH_SAMPLES = 3;
const BOUNDS_FIT_ROTATE_FACTOR = 2;

export class CameraNavigationController extends BaseViewportEventHandler {
    private readonly context: ViewportControllerContext;

    constructor(context: ViewportControllerContext) {
        super();
        this.context = context;
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

    public override onKeyDown(event: EditorKeyInput): boolean {
        if (shouldIgnoreShortcut(event)) {
            return false;
        }

        if (event.key !== 'f' && event.key !== 'F') {
            return false;
        }

        this.fitView();
        return true;
    }

    public override onMiddleDrag(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerMove(event);
    }

    public override onMiddleDragStart(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerDown(event);
    }

    public override onMiddleDragStop(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerEnd(event);
    }

    public override onPointerDown(event: EditorPointerInput): boolean {
        return isViewNavigationPointer(event);
    }

    public override onPointerUp(event: EditorPointerInput): boolean {
        return isViewNavigationPointer(event);
    }

    public override onRightDrag(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerMove(event);
    }

    public override onRightDragStart(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerDown(event);
    }

    public override onRightDragStop(event: EditorPointerInput): boolean {
        return this.handleNavigationPointerEnd(event);
    }

    public override onWheel(event: EditorWheelInput): boolean {
        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).zoom(
                {
                    deltaY: event.deltaY ?? 0,
                    point: event.point,
                    zoomAnchor: current.navigation.camera.target,
                },
                this.context.getDisplayBounds(),
            );

            return new EditorController(current).applyNavigation(navigation);
        });
        return true;
    }

    protected unhandled(): boolean {
        return false;
    }

    private handleNavigationPointerDown(event: EditorPointerInput): boolean {
        if (!isViewNavigationPointer(event)) {
            return false;
        }

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).begin({
                button: event.button,
                ctrlKey: event.modifiers.ctrl,
                orbitPivot: this.resolveNavigationCenter(current, event.point),
                pointerId: event.pointerId,
                point: event.point,
            });

            return new EditorController(current).applyNavigation(navigation);
        });
        return true;
    }

    private resolveNavigationCenter(
        state: EditorState,
        point: EditorPointerInput['point'],
    ): Vector3 {
        return (
            this.getRotateCenterUnderPoint(state, point) ??
            this.getRotateCenterBasedOnWindowDepths(state, false) ??
            this.getRotateCenterBasedOnWindowDepths(state, true) ??
            this.getRotateCenterBasedOnBounds(state) ??
            this.getRotateCenterBasedOnCanvasLocationAndBoundsDepth(state, point) ??
            state.navigation.camera.target
        );
    }

    private getRotateCenterUnderPoint(
        state: EditorState,
        point: EditorPointerInput['point'],
    ): Vector3 | null {
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
        point: EditorPointerInput['point'],
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

    private handleNavigationPointerMove(event: EditorPointerInput): boolean {
        const handled = isViewNavigationPointer(event);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).update(
                {
                    button: event.button,
                    ctrlKey: event.modifiers.ctrl,
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
        return handled;
    }

    private handleNavigationPointerEnd(event: EditorPointerInput): boolean {
        const handled = isViewNavigationPointer(event);

        this.context.updateState((current) => {
            const navigation = new ViewNavigationController(current.navigation).end(
                event.pointerId,
            );

            if (navigation === current.navigation) {
                return current;
            }

            return new EditorController(current).applyNavigation(navigation);
        });
        return handled;
    }
}

export class EditorDefaultController extends BaseViewportEventHandler {
    protected unhandled(): boolean {
        return false;
    }
}

export function isCancelCommandInput(event: EditorKeyInput): boolean {
    return !shouldIgnoreShortcut(event) && event.key === 'Escape';
}

function isViewNavigationPointer(event: EditorPointerInput): boolean {
    return event.button === 1 || event.button === 2;
}

function shouldIgnoreShortcut(event: EditorKeyInput): boolean {
    if (event.modifiers.alt || event.modifiers.ctrl || event.modifiers.meta) {
        return true;
    }

    return event.targetIsTextInput;
}
