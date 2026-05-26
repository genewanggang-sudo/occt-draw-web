import {
    calculateBoundingSphere,
    createStandardCameraState,
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
import { createDefaultCadDocument } from '@occt-draw/cad-model';
import {
    PickService,
    ViewNavigationController,
    ViewportInput,
    createViewNavigationState,
    interpolateCameraState,
    rotateCameraByViewCubeArrow,
    type ScreenPoint,
    type ViewportInputEvent,
    type ViewportPointerInputEvent,
    type ViewCubeRotationStep,
} from '@occt-draw/platform';
import { ViewportInteractionController } from './ViewportInteractionController';
import { createEditorRenderGraph, createEditorRenderHighlight } from './editorRendering';
import { createInitialEditorState } from '../state/createInitialEditorState';
import type { EditorState } from '../state/editorState';

export interface EditorViewportRuntimeOptions {
    readonly getState: () => EditorState;
    readonly hostElement: HTMLElement;
    readonly onStatusChange?: (status: EditorViewportRuntimeStatus) => void;
    readonly updateState: (updater: (current: EditorState) => EditorState) => void;
}

export interface EditorViewportRuntimeStatus {
    readonly displayObjectCount: number;
    readonly rendererStatus: string;
}

export interface CreateDefaultEditorStateOptions {
    readonly viewportSize?: {
        readonly height: number;
        readonly width: number;
    };
}

const INITIAL_VIEWPORT_SIZE = { width: 1, height: 1 } as const;
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

export class EditorViewportRuntime {
    private readonly canvas: HTMLCanvasElement;
    private readonly inputAdapter: ViewportInput;
    private readonly interactionController: ViewportInteractionController;
    private readonly options: EditorViewportRuntimeOptions;
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
    private viewCubePointer: null | {
        readonly pointerId: number;
        readonly point: ScreenPoint;
        readonly targetId: ViewCubeTargetId;
    } = null;

    constructor(options: EditorViewportRuntimeOptions) {
        this.options = options;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'cad-workbench__canvas';
        this.currentGraph = this.createRenderGraphWithOverlay();
        this.currentDisplayBounds = this.currentGraph.navigationBounds;
        this.currentDisplaySphere = calculateBoundingSphere(this.currentDisplayBounds);
        this.interactionController = new ViewportInteractionController({
            getActiveCommandId: () => this.options.getState().commandSession.id,
            getDisplayBounds: () => this.currentDisplayBounds,
            getDisplaySphere: () => this.currentDisplaySphere,
            getRenderGraph: () => this.currentGraph,
            getState: () => this.options.getState(),
            pickService: this.pickService,
            sampleNavigationDepths: (input) => this.renderer?.sampleNavigationDepths(input) ?? [],
            updateState: this.options.updateState,
        });
        this.inputAdapter = new ViewportInput({
            onInput: (event) => {
                this.handleViewportInput(event);
            },
        });

        options.hostElement.append(this.canvas);
        this.inputAdapter.attach(this.canvas);
        this.attachResizeObserver();
        this.initializeRenderer();
        this.sync();
    }

    private handleViewportInput(event: ViewportInputEvent): void {
        if (event.kind === 'context-menu') {
            event.preventDefault();
            return;
        }

        if (event.kind === 'key' || event.kind === 'wheel') {
            this.stopNavigationAnimation();

            if (this.interactionController.handleInput(event)) {
                event.preventDefault();
            }
            return;
        }

        if (this.handleViewCubePointerInput(event)) {
            event.preventDefault();
            return;
        }

        if (event.buttons !== 0) {
            this.stopNavigationAnimation();
        }

        if (this.interactionController.handleInput(event)) {
            if (event.phase === 'down') {
                event.capturePointer();
            }
            event.preventDefault();
        }

        if (event.phase === 'up' || event.phase === 'cancel') {
            event.releasePointer();
        }
    }

    public activateCommand(
        commandId: Parameters<ViewportInteractionController['activateCommand']>[0],
    ): void {
        this.interactionController.activateCommand(commandId);
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
        this.animateFitView();
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

    private animateFitView(durationMs = 140): void {
        const state = this.options.getState();
        const navigation = new ViewNavigationController(state.navigation).fit(
            this.currentDisplayBounds,
            this.currentDisplaySphere,
        );

        this.animateNavigationCamera(navigation.camera, durationMs);
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

    private handleViewCubePointerInput(event: ViewportPointerInputEvent): boolean {
        if (event.phase === 'cancel') {
            return this.handleViewCubePointerCancel(event);
        }

        if (event.phase === 'down') {
            return this.handleViewCubePointerDown(event);
        }

        if (event.phase === 'move') {
            return this.handleViewCubePointerMove(event);
        }

        return this.handleViewCubePointerUp(event);
    }

    private handleViewCubePointerCancel(event: ViewportPointerInputEvent): boolean {
        const handled = this.viewCubePointer?.pointerId === event.pointerId;

        if (handled) {
            this.viewCubePointer = null;
            this.hoveredViewCubeTargetId = null;
            event.releasePointer();
            this.sync();
        }

        return handled;
    }

    private handleViewCubePointerDown(event: ViewportPointerInputEvent): boolean {
        if (event.button !== 0) {
            return false;
        }

        const targetId = this.hitTestCurrentViewCube(event.point);

        if (!targetId) {
            this.viewCubePointer = null;
            this.hoveredViewCubeTargetId = null;
            this.sync();
            return false;
        }

        this.viewCubePointer = {
            pointerId: event.pointerId,
            point: event.point,
            targetId,
        };
        this.hoveredViewCubeTargetId = targetId;
        this.stopNavigationAnimation();
        event.capturePointer();
        this.sync();

        return true;
    }

    private handleViewCubePointerMove(event: ViewportPointerInputEvent): boolean {
        const targetId = this.hitTestCurrentViewCube(event.point);

        if (targetId !== this.hoveredViewCubeTargetId) {
            this.hoveredViewCubeTargetId = targetId;
            this.sync();
        }

        return targetId !== null || this.viewCubePointer !== null;
    }

    private handleViewCubePointerUp(event: ViewportPointerInputEvent): boolean {
        const down = this.viewCubePointer;

        if (down?.pointerId !== event.pointerId) {
            return false;
        }

        this.viewCubePointer = null;
        const targetId = down.targetId;

        if (Measurement.distance2(event.point, down.point).value <= VIEW_CUBE_CLICK_DISTANCE) {
            if (isViewCubeArrowTarget(targetId)) {
                this.animateViewCubeArrow(targetId, getViewCubeRotationStep(event));
            } else {
                const view = VIEW_CUBE_STANDARD_VIEWS[targetId];

                if (view) {
                    this.animateStandardView(view);
                }
            }
        }

        this.hoveredViewCubeTargetId = this.hitTestCurrentViewCube(event.point);
        event.releasePointer();
        this.sync();

        return true;
    }

    private hitTestCurrentViewCube(point: ScreenPoint): ViewCubeTargetId | null {
        return new ViewCube().hitTest({
            camera: this.options.getState().navigation.camera,
            point,
            viewportSize: this.options.getState().navigation.viewportSize,
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

function getViewCubeRotationStep(event: ViewportPointerInputEvent): ViewCubeRotationStep {
    if (event.modifiers.shift) {
        return 'coarse';
    }

    if (event.modifiers.ctrl || event.modifiers.meta) {
        return 'fine';
    }

    return 'default';
}
