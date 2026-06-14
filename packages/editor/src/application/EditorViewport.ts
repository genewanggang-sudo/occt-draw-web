import {
    calculateBoundingSphere,
    RenderEngine,
    RenderLayer,
    ViewCube,
    type BoundingBox3,
    type BoundingSphere,
    type RenderGraph,
    type StandardCameraView,
    type ViewCubeArrowCommand,
    type ViewCubeTargetId,
} from '@occt-draw/canvas';
import { Measurement } from '@occt-draw/math';
import {
    BaseViewportEventHandler,
    PickService,
    ViewNavigationController,
    ViewportInteractor,
    interpolateCameraState,
    rotateCameraByViewCubeArrow,
    type ScreenPoint,
    type ViewportEventHandler,
    type ViewportMouseEvent,
    type ViewCubeRotationStep,
} from '@occt-draw/platform';
import {
    CameraNavigationController,
    EditorDefaultController,
    type ViewportControllerContext,
} from './ViewportControllers';
import { createEditorRenderGraph, createEditorRenderHighlight } from './editorRendering';
import type { EditorState } from '../state/editorState';

export interface EditorViewportOptions {
    readonly commandManager: ViewportEventHandler;
    readonly getState: () => EditorState;
    readonly hostElement: HTMLElement;
    readonly onStatusChange?: (status: EditorViewportStatus) => void;
    readonly updateState: (updater: (current: EditorState) => EditorState) => void;
}

export interface EditorViewportStatus {
    readonly displayObjectCount: number;
    readonly rendererStatus: string;
}

const VIEW_CUBE_CLICK_DISTANCE = 4;
const VIEW_CUBE_STANDARD_VIEWS: Readonly<Partial<Record<ViewCubeTargetId, StandardCameraView>>> = {
    back: 'back',
    bottom: 'bottom',
    front: 'front',
    left: 'left',
    'left-back-bottom': 'left-back-bottom',
    'left-back-top': 'left-back-top',
    'left-front-bottom': 'front-left-bottom',
    'left-front-top': 'front-left-top',
    right: 'right',
    'right-back-bottom': 'right-back-bottom',
    'right-back-top': 'right-back-top',
    'right-front-bottom': 'front-right-bottom',
    'right-front-top': 'front-right-top',
    top: 'top',
};
const VIEW_CUBE_ARROW_TARGETS = new Set<ViewCubeTargetId>([
    'arrow-ccw',
    'arrow-cw',
    'arrow-down',
    'arrow-left',
    'arrow-right',
    'arrow-up',
]);

export class EditorViewport {
    private readonly canvas: HTMLCanvasElement;
    private readonly cameraNavigationController: CameraNavigationController;
    private readonly inputAdapter: ViewportInteractor;
    private readonly options: EditorViewportOptions;
    private readonly pickService = new PickService();
    private renderer: RenderEngine | null = null;
    private rendererStatus = 'Initializing WebGL2';
    private displayObjectCount = 0;
    private currentGraph: RenderGraph;
    private currentDisplayBounds: BoundingBox3;
    private currentDisplaySphere: BoundingSphere;
    private hoveredViewCubeTargetId: ViewCubeTargetId | null = null;
    private navigationAnimationFrame: number | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(options: EditorViewportOptions) {
        this.options = options;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'cad-workbench__canvas';
        this.currentGraph = this.createRenderGraphWithOverlay();
        this.currentDisplayBounds = this.currentGraph.navigationBounds;
        this.currentDisplaySphere = calculateBoundingSphere(this.currentDisplayBounds);
        const controllerContext: ViewportControllerContext = {
            getDisplayBounds: () => this.currentDisplayBounds,
            getDisplaySphere: () => this.currentDisplaySphere,
            getRenderGraph: () => this.currentGraph,
            getState: () => this.options.getState(),
            sampleNavigationDepths: (input) => this.renderer?.sampleNavigationDepths(input) ?? [],
            updateState: this.options.updateState,
        };
        this.cameraNavigationController = new CameraNavigationController(controllerContext);
        this.inputAdapter = new ViewportInteractor({
            handlers: [
                new ViewCubeController({
                    animateStandardView: (view) => {
                        this.animateStandardView(view);
                    },
                    animateViewCubeArrow: (command, step) => {
                        this.animateViewCubeArrow(command, step);
                    },
                    getCamera: () => this.options.getState().navigation.camera,
                    getHoveredTargetId: () => this.hoveredViewCubeTargetId,
                    getViewportSize: () => this.options.getState().navigation.viewportSize,
                    setHoveredTargetId: (targetId) => {
                        this.hoveredViewCubeTargetId = targetId;
                    },
                    stopNavigationAnimation: () => {
                        this.stopNavigationAnimation();
                    },
                    sync: () => {
                        this.sync();
                    },
                }),
                this.options.commandManager,
                new EditorDefaultController(),
                this.cameraNavigationController,
            ],
        });

        options.hostElement.append(this.canvas);
        this.inputAdapter.attach(this.canvas);
        this.attachResizeObserver();
        this.initializeRenderer();
        this.sync();
    }

    public dispose(): void {
        this.stopNavigationAnimation();
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        this.inputAdapter.detach();
        this.renderer?.dispose();
        this.renderer = null;
        this.canvas.remove();
    }

    public fitView(): void {
        this.cameraNavigationController.fitView();
    }

    public setStandardView(view: StandardCameraView): void {
        this.animateStandardView(view);
    }

    public sync(): void {
        this.currentGraph = this.createRenderGraphWithOverlay();
        this.currentDisplayBounds = this.currentGraph.navigationBounds;
        this.currentDisplaySphere = calculateBoundingSphere(this.currentDisplayBounds);
        this.displayObjectCount = countSceneRenderObjects(this.currentGraph);
        this.emitStatus();

        if (!this.renderer) {
            return;
        }

        const state = this.options.getState();

        this.renderer.resize(state.navigation.viewportSize);
        this.renderer.setGraph(this.currentGraph);
        this.renderer.setHighlight(createEditorRenderHighlight(state));
        this.renderer.render(state.navigation.camera);
    }

    public pickSelectionTarget(input: {
        readonly camera: EditorState['navigation']['camera'];
        readonly point: ScreenPoint;
        readonly thresholdPixels: number;
        readonly viewportSize: EditorState['navigation']['viewportSize'];
    }) {
        return this.pickService.pickSelectionTarget({
            camera: input.camera,
            graph: this.currentGraph,
            point: input.point,
            thresholdPixels: input.thresholdPixels,
            viewportSize: input.viewportSize,
        });
    }

    private animateNavigationCamera(
        targetCamera: EditorState['navigation']['camera'],
        durationMs: number,
    ): void {
        this.stopNavigationAnimation();

        const startCamera = this.options.getState().navigation.camera;
        const startTime = performance.now();

        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / durationMs, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const camera =
                progress >= 1
                    ? targetCamera
                    : interpolateCameraState(startCamera, targetCamera, easedProgress);

            this.options.updateState((current) => {
                const navigation = new ViewNavigationController(current.navigation).setCamera(
                    camera,
                    this.currentDisplaySphere,
                    this.currentDisplayBounds,
                );

                return {
                    ...current,
                    navigation,
                };
            });

            if (progress < 1) {
                this.navigationAnimationFrame = window.requestAnimationFrame(animate);
            } else {
                this.navigationAnimationFrame = null;
            }
        };

        this.navigationAnimationFrame = window.requestAnimationFrame(animate);
    }

    private animateStandardView(view: StandardCameraView, durationMs = 180): void {
        const state = this.options.getState();
        const navigation = new ViewNavigationController(state.navigation).setStandardView(
            this.currentDisplayBounds,
            this.currentDisplaySphere,
            view,
        );

        this.animateNavigationCamera(navigation.camera, durationMs);
    }

    private animateViewCubeArrow(command: ViewCubeArrowCommand, step: ViewCubeRotationStep): void {
        const state = this.options.getState();
        const camera = rotateCameraByViewCubeArrow(
            state.navigation.camera,
            state.navigation.orbitPivot,
            command,
            step,
        );
        const navigation = new ViewNavigationController(state.navigation).setCamera(
            camera,
            this.currentDisplaySphere,
            this.currentDisplayBounds,
        );

        this.animateNavigationCamera(navigation.camera, 140);
    }

    private attachResizeObserver(): void {
        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) {
                return;
            }

            const viewportSize = getContentRectViewportSize(entry.contentRect);

            this.options.updateState((current) => {
                const navigation = new ViewNavigationController(current.navigation).updateViewport(
                    viewportSize,
                );

                return {
                    ...current,
                    navigation,
                };
            });
        });
        this.resizeObserver.observe(this.canvas);
    }

    private createRenderGraphWithOverlay(): RenderGraph {
        const graph = createEditorRenderGraph(this.options.getState());
        const overlayLayer = new RenderLayer('overlay', {
            depthPolicy: 'overlay',
            navigationRole: 'excluded',
            pickable: false,
        });

        overlayLayer.add(new ViewCube({ hoveredTargetId: this.hoveredViewCubeTargetId }));
        graph.addLayer(overlayLayer);

        return graph;
    }

    private emitStatus(): void {
        this.options.onStatusChange?.({
            displayObjectCount: this.displayObjectCount,
            rendererStatus: this.rendererStatus,
        });
    }

    private initializeRenderer(): void {
        try {
            this.renderer = new RenderEngine(this.canvas);
            this.rendererStatus = 'WebGL2 ready';
        } catch (error) {
            this.rendererStatus =
                error instanceof Error ? error.message : 'Current browser does not support WebGL2';
        }
        this.emitStatus();
    }

    private stopNavigationAnimation(): void {
        const animationFrame = this.navigationAnimationFrame;

        if (animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            this.navigationAnimationFrame = null;
        }
    }
}

interface ViewCubeControllerOptions {
    readonly animateStandardView: (view: StandardCameraView) => void;
    readonly animateViewCubeArrow: (
        command: ViewCubeArrowCommand,
        step: ViewCubeRotationStep,
    ) => void;
    readonly getCamera: () => EditorState['navigation']['camera'];
    readonly getHoveredTargetId: () => ViewCubeTargetId | null;
    readonly getViewportSize: () => EditorState['navigation']['viewportSize'];
    readonly setHoveredTargetId: (targetId: ViewCubeTargetId | null) => void;
    readonly stopNavigationAnimation: () => void;
    readonly sync: () => void;
}

class ViewCubeController extends BaseViewportEventHandler {
    private pointer: null | {
        readonly pointerId: number;
        readonly point: ScreenPoint;
        readonly targetId: ViewCubeTargetId;
    } = null;

    constructor(private readonly options: ViewCubeControllerOptions) {
        super();
    }

    public override onLeftDragCancel(event: ViewportMouseEvent): boolean {
        return this.clearPointer(event);
    }

    public override onPointerDown(event: ViewportMouseEvent): boolean {
        if (event.button !== 0) {
            return false;
        }

        const targetId = this.hitTest(event.point);

        if (!targetId) {
            this.pointer = null;
            this.setHoveredTargetId(null);
            return false;
        }

        this.pointer = {
            pointerId: event.pointerId,
            point: event.point,
            targetId,
        };
        this.setHoveredTargetId(targetId);
        this.options.stopNavigationAnimation();

        return true;
    }

    public override onPointerMove(event: ViewportMouseEvent): boolean {
        const targetId = this.hitTest(event.point);

        if (targetId !== this.options.getHoveredTargetId()) {
            this.setHoveredTargetId(targetId);
        }

        return targetId !== null || this.pointer !== null;
    }

    public override onPointerUp(event: ViewportMouseEvent): boolean {
        const down = this.pointer;

        if (down?.pointerId !== event.pointerId) {
            return false;
        }

        this.pointer = null;
        const targetId = down.targetId;

        if (Measurement.distance2(event.point, down.point).value <= VIEW_CUBE_CLICK_DISTANCE) {
            if (isViewCubeArrowTarget(targetId)) {
                this.options.animateViewCubeArrow(targetId, getViewCubeRotationStep(event));
            } else {
                const view = VIEW_CUBE_STANDARD_VIEWS[targetId];

                if (view) {
                    this.options.animateStandardView(view);
                }
            }
        }

        this.setHoveredTargetId(this.hitTest(event.point));

        return true;
    }

    protected unhandled(): boolean {
        return false;
    }

    private clearPointer(event: ViewportMouseEvent): boolean {
        const handled = this.pointer?.pointerId === event.pointerId;

        if (handled) {
            this.pointer = null;
            this.setHoveredTargetId(null);
        }

        return handled;
    }

    private hitTest(point: ScreenPoint): ViewCubeTargetId | null {
        return new ViewCube().hitTest({
            camera: this.options.getCamera(),
            point,
            viewportSize: this.options.getViewportSize(),
        });
    }

    private setHoveredTargetId(targetId: ViewCubeTargetId | null): void {
        this.options.setHoveredTargetId(targetId);
        this.options.sync();
    }
}

function countSceneRenderObjects(graph: RenderGraph): number {
    return graph.layers.reduce((total, layer) => {
        if (!layer.visible || layer.depthPolicy === 'overlay') {
            return total;
        }

        return total + layer.objects.filter((object) => object.visible).length;
    }, 0);
}

function getContentRectViewportSize(rect: Pick<DOMRectReadOnly, 'height' | 'width'>) {
    return {
        height: Math.max(1, Math.round(rect.height)),
        width: Math.max(1, Math.round(rect.width)),
    };
}

function isViewCubeArrowTarget(targetId: ViewCubeTargetId): targetId is ViewCubeArrowCommand {
    return VIEW_CUBE_ARROW_TARGETS.has(targetId);
}

function getViewCubeRotationStep(event: ViewportMouseEvent): ViewCubeRotationStep {
    if (event.modifiers.shift) {
        return 'coarse';
    }

    if (event.modifiers.ctrl || event.modifiers.meta) {
        return 'fine';
    }

    return 'default';
}
