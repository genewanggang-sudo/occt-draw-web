import { projectPartStudioToRenderGraph } from '@occt-draw/cad-rendering';
import { createDefaultCadDocument, getActivePartStudio } from '@occt-draw/core';
import {
    createInitialEditorState,
    createViewNavigationState,
    EditorController,
    evaluateCommandAvailabilityMap,
    getCommandLabel,
    interpolateCameraState,
    PickService,
    rotateCameraByViewCubeArrow,
    ViewNavigationController,
    ViewportInteractionController,
    type EditorKeyInput,
    type EditorPointerInput,
    type EditorState,
    type EditorWheelInput,
    type ScreenPoint,
    type ViewCubeRotationStep,
} from '@occt-draw/editor';
import {
    calculateBoundingSphere,
    createStandardCameraState,
    RenderEngine,
    RenderLayer,
    type RenderGraph,
    type RenderHighlightState,
    type StandardCameraView,
    ViewCube,
    type ViewCubeArrowCommand,
    type ViewCubeTargetId,
} from '@occt-draw/webgl-engine';
import { Measurement } from '@occt-draw/math';
import { APP_NAME } from '@occt-draw/shared';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ViewportInputAdapter } from '../editor/application/ViewportInputAdapter';
import { CommandToolbar } from '../editor/commands/CommandToolbar';
import { ViewToolbar } from '../editor/view-toolbar/ViewToolbar';
import { CadViewport } from '../editor/viewport/CadViewport';
import { InspectorPanel } from '../editor/workbench/InspectorPanel';
import { ModelTreePanel } from '../editor/workbench/ModelTreePanel';
import { WorkbenchLayout } from '../editor/workbench/WorkbenchLayout';

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

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<RenderEngine | null>(null);
    const pickServiceRef = useRef(new PickService());
    const [editorState, setEditorState] = useState<EditorState>(() => {
        const document = createDefaultCadDocument();
        const activePartStudio = getActivePartStudio(document);
        const graph = projectPartStudioToRenderGraph(activePartStudio);
        const displayBounds = graph.navigationBounds;
        const displaySphere = calculateBoundingSphere(displayBounds);
        const camera = createStandardCameraState(displayBounds, 'trimetric', INITIAL_VIEWPORT_SIZE);
        const navigation = createViewNavigationState(camera, displaySphere, INITIAL_VIEWPORT_SIZE);

        return createInitialEditorState({
            document,
            navigation,
        });
    });
    const [rendererStatus, setRendererStatus] = useState('正在初始化 WebGL2');
    const [hoveredViewCubeTargetId, setHoveredViewCubeTargetId] = useState<ViewCubeTargetId | null>(
        null,
    );
    const viewCubePointerRef = useRef<null | {
        readonly pointerId: number;
        readonly point: ScreenPoint;
        readonly targetId: ViewCubeTargetId;
    }>(null);

    const activePartStudio = useMemo(
        () => getActivePartStudio(editorState.document),
        [editorState.document],
    );
    const renderGraph = useMemo(() => {
        const graph = projectPartStudioToRenderGraph(activePartStudio, editorState.draft);
        const overlayLayer = new RenderLayer('overlay', {
            depthPolicy: 'overlay',
            navigationRole: 'excluded',
            pickable: false,
        });

        overlayLayer.add(new ViewCube({ hoveredTargetId: hoveredViewCubeTargetId }));
        graph.addLayer(overlayLayer);

        return graph;
    }, [activePartStudio, editorState.draft, hoveredViewCubeTargetId]);
    const displayBounds = useMemo(() => renderGraph.navigationBounds, [renderGraph]);
    const displaySphere = useMemo(() => calculateBoundingSphere(displayBounds), [displayBounds]);
    const selectedObjectIds = editorState.selection.selection.objectIds;
    const selectedTarget = editorState.selection.selection.primaryTarget;
    const renderHighlight = useMemo(
        (): RenderHighlightState => ({
            hoveredObjectId: editorState.selection.hoveredObjectId,
            preselectedObjectId: editorState.selection.preselectedTarget?.objectId ?? null,
            preselectedPrimitiveId: editorState.selection.preselectedTarget?.primitiveId ?? null,
            selectedObjectIds,
            selectedPrimitiveId: selectedTarget?.primitiveId ?? null,
        }),
        [
            editorState.selection.hoveredObjectId,
            editorState.selection.preselectedTarget,
            selectedObjectIds,
            selectedTarget,
        ],
    );
    const selectedObjects = useMemo(
        () => activePartStudio.objects.filter((object) => selectedObjectIds.includes(object.id)),
        [activePartStudio.objects, selectedObjectIds],
    );
    const activeCommandId = editorState.commandSession.id;
    const activeCommandLabel = getCommandLabel(activeCommandId);
    const selectedReferencePlaneCount = selectedObjects.filter(
        (object) => object.kind === 'reference-plane',
    ).length;
    const commandAvailability = useMemo(
        () =>
            evaluateCommandAvailabilityMap({
                activeSketchTool: editorState.activeSketchSession?.activeTool ?? null,
                hasSketchProfile: false,
                isEditingSketch: editorState.activeSketchSession !== null,
                selectionObjectIds: selectedObjectIds,
                selectedReferencePlaneCount,
            }),
        [editorState.activeSketchSession, selectedObjectIds, selectedReferencePlaneCount],
    );

    const navigationAnimationRef = useRef<number | null>(null);
    const editorStateRef = useRef(editorState);
    const renderGraphRef = useRef(renderGraph);
    const displayBoundsRef = useRef(displayBounds);
    const displaySphereRef = useRef(displaySphere);
    const activeCommandIdRef = useRef(activeCommandId);

    useEffect(() => {
        editorStateRef.current = editorState;
        renderGraphRef.current = renderGraph;
        displayBoundsRef.current = displayBounds;
        displaySphereRef.current = displaySphere;
        activeCommandIdRef.current = activeCommandId;
    }, [activeCommandId, displayBounds, renderGraph, displaySphere, editorState]);

    useEffect(
        () => () => {
            stopNavigationAnimation();
        },
        [],
    );

    function stopNavigationAnimation(): void {
        const animationFrame = navigationAnimationRef.current;

        if (animationFrame !== null) {
            window.cancelAnimationFrame(animationFrame);
            navigationAnimationRef.current = null;
        }
    }

    function animateNavigationCamera(
        targetCamera: EditorState['navigation']['camera'],
        durationMs: number,
    ): void {
        stopNavigationAnimation();

        const startCamera = editorStateRef.current.navigation.camera;
        const startTime = performance.now();

        const animate = (now: number) => {
            const progress = Math.min((now - startTime) / durationMs, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const camera =
                progress >= 1
                    ? targetCamera
                    : interpolateCameraState(startCamera, targetCamera, easedProgress);

            setEditorState((current) => {
                const navigation = new ViewNavigationController(current.navigation).setCamera(
                    camera,
                    displaySphereRef.current,
                    displayBoundsRef.current,
                );

                return {
                    ...current,
                    navigation,
                };
            });

            if (progress < 1) {
                navigationAnimationRef.current = window.requestAnimationFrame(animate);
            } else {
                navigationAnimationRef.current = null;
            }
        };

        navigationAnimationRef.current = window.requestAnimationFrame(animate);
    }

    function animateStandardView(view: StandardCameraView, durationMs = 180): void {
        const current = editorStateRef.current;
        const navigation = new ViewNavigationController(current.navigation).setStandardView(
            displayBoundsRef.current,
            displaySphereRef.current,
            view,
        );

        animateNavigationCamera(navigation.camera, durationMs);
    }

    function animateFitView(durationMs = 140): void {
        const current = editorStateRef.current;
        const navigation = new ViewNavigationController(current.navigation).fit(
            displayBoundsRef.current,
            displaySphereRef.current,
        );

        animateNavigationCamera(navigation.camera, durationMs);
    }

    function animateViewCubeArrow(command: ViewCubeArrowCommand, step: ViewCubeRotationStep): void {
        const current = editorStateRef.current;
        const camera = rotateCameraByViewCubeArrow(
            current.navigation.camera,
            current.navigation.orbitPivot,
            command,
            step,
        );
        const navigation = new ViewNavigationController(current.navigation).setCamera(
            camera,
            displaySphereRef.current,
            displayBoundsRef.current,
        );

        animateNavigationCamera(navigation.camera, 140);
    }

    function hitTestCurrentViewCube(point: ScreenPoint): ViewCubeTargetId | null {
        return new ViewCube().hitTest({
            camera: editorStateRef.current.navigation.camera,
            point,
            viewportSize: editorStateRef.current.navigation.viewportSize,
        });
    }

    function handleViewCubePointerMove(point: ScreenPoint): boolean {
        const targetId = hitTestCurrentViewCube(point);

        setHoveredViewCubeTargetId(targetId);

        return targetId !== null || viewCubePointerRef.current !== null;
    }

    function handleViewCubePointerDown(pointerId: number, point: ScreenPoint): boolean {
        const targetId = hitTestCurrentViewCube(point);

        if (!targetId) {
            viewCubePointerRef.current = null;
            setHoveredViewCubeTargetId(null);
            return false;
        }

        viewCubePointerRef.current = {
            pointerId,
            point,
            targetId,
        };
        setHoveredViewCubeTargetId(targetId);
        stopNavigationAnimation();

        return true;
    }

    function handleViewCubePointerCancel(pointerId: number): boolean {
        const handled = viewCubePointerRef.current?.pointerId === pointerId;

        if (handled) {
            viewCubePointerRef.current = null;
            setHoveredViewCubeTargetId(null);
        }

        return handled;
    }

    function handleViewCubePointerUp(event: PointerEvent, point: ScreenPoint): boolean {
        const down = viewCubePointerRef.current;

        if (down?.pointerId !== event.pointerId) {
            return false;
        }

        viewCubePointerRef.current = null;
        const targetId = down.targetId;

        if (Measurement.distance2(point, down.point).value <= VIEW_CUBE_CLICK_DISTANCE) {
            if (isViewCubeArrowTarget(targetId)) {
                animateViewCubeArrow(targetId, getViewCubeRotationStep(event));
            } else {
                const view = VIEW_CUBE_STANDARD_VIEWS[targetId];

                if (view) {
                    animateStandardView(view);
                }
            }
        }

        setHoveredViewCubeTargetId(hitTestCurrentViewCube(point));

        return true;
    }

    const interactionControllerRef = useRef<ViewportInteractionController | null>(null);

    interactionControllerRef.current ??= new ViewportInteractionController({
        getActiveCommandId: () => activeCommandIdRef.current,
        getDisplayBounds: () => displayBoundsRef.current,
        getRenderGraph: () => renderGraphRef.current,
        getDisplaySphere: () => displaySphereRef.current,
        getState: () => editorStateRef.current,
        pickService: pickServiceRef.current,
        sampleNavigationDepths: (input) => rendererRef.current?.sampleNavigationDepths(input) ?? [],
        updateState: (updater) => {
            setEditorState(updater);
        },
    });

    useLayoutEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        try {
            rendererRef.current = new RenderEngine(canvas);
            setEditorState((current) => {
                const navigation = new ViewNavigationController(current.navigation).updateViewport(
                    getCanvasViewportSize(canvas),
                );

                return {
                    ...current,
                    navigation,
                };
            });
            setRendererStatus('WebGL2 已就绪');
        } catch (error) {
            setRendererStatus(error instanceof Error ? error.message : '当前浏览器不支持 WebGL2');
        }

        return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) {
                return;
            }

            const viewportSize = getContentRectViewportSize(entry.contentRect);

            setEditorState((current) => {
                const navigation = new ViewNavigationController(current.navigation).updateViewport(
                    viewportSize,
                );

                return {
                    ...current,
                    navigation,
                };
            });
        });

        observer.observe(canvas);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !interactionControllerRef.current) {
            return;
        }

        const inputAdapter = new ViewportInputAdapter({
            onContextMenu(event) {
                event.preventDefault();
            },
            onKeyDown(event) {
                stopNavigationAnimation();
                const handled = interactionControllerRef.current?.handleKeyDown(
                    toEditorKeyInput(event),
                );

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerCancel(event) {
                if (handleViewCubePointerCancel(event.pointerId)) {
                    releasePointerCaptureIfNeeded(canvas, event.pointerId);
                    event.preventDefault();
                    return;
                }

                stopNavigationAnimation();
                const handled = interactionControllerRef.current?.handlePointerCancel(
                    toEditorPointerInput(canvas, event),
                );
                releasePointerCaptureIfNeeded(canvas, event.pointerId);

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerDown(event) {
                const point = getScreenPoint(canvas, event);

                if (event.button === 0 && handleViewCubePointerDown(event.pointerId, point)) {
                    canvas.setPointerCapture(event.pointerId);
                    event.preventDefault();
                    return;
                }

                stopNavigationAnimation();
                const handled = interactionControllerRef.current?.handlePointerDown(
                    toEditorPointerInputFromPoint(event, point),
                );

                if (handled) {
                    canvas.setPointerCapture(event.pointerId);
                    event.preventDefault();
                }
            },
            onPointerMove(event) {
                const point = getScreenPoint(canvas, event);

                if (handleViewCubePointerMove(point)) {
                    event.preventDefault();
                    return;
                }

                if (event.buttons !== 0) {
                    stopNavigationAnimation();
                }

                const handled = interactionControllerRef.current?.handlePointerMove(
                    toEditorPointerInputFromPoint(event, point),
                );

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerUp(event) {
                const point = getScreenPoint(canvas, event);

                if (handleViewCubePointerUp(event, point)) {
                    releasePointerCaptureIfNeeded(canvas, event.pointerId);
                    event.preventDefault();
                    return;
                }

                stopNavigationAnimation();
                const handled = interactionControllerRef.current?.handlePointerUp(
                    toEditorPointerInputFromPoint(event, point),
                );
                releasePointerCaptureIfNeeded(canvas, event.pointerId);

                if (handled) {
                    event.preventDefault();
                }
            },
            onWheel(event) {
                stopNavigationAnimation();
                const handled = interactionControllerRef.current?.handleWheel(
                    toEditorWheelInput(canvas, event),
                );

                if (handled) {
                    event.preventDefault();
                }
            },
        });

        inputAdapter.attach(canvas);

        return () => {
            inputAdapter.detach();
        };
    }, []);

    useEffect(() => {
        rendererRef.current?.resize(editorState.navigation.viewportSize);
        rendererRef.current?.setGraph(renderGraph);
        rendererRef.current?.setHighlight(renderHighlight);
        rendererRef.current?.render(editorState.navigation.camera);
    }, [
        renderGraph,
        renderHighlight,
        editorState.navigation.camera,
        editorState.navigation.viewportSize,
    ]);

    return (
        <main className="cad-workbench">
            <header className="cad-workbench__topbar">
                <div className="cad-workbench__brand">
                    <span className="cad-workbench__mark">OC</span>
                    <span className="cad-workbench__title">{appTitle}</span>
                </div>
                <nav className="cad-workbench__actions" aria-label="基础功能入口">
                    <button className="cad-workbench__action" type="button">
                        打开
                    </button>
                    <button className="cad-workbench__action" type="button">
                        保存
                    </button>
                    <button className="cad-workbench__action" type="button">
                        设置
                    </button>
                </nav>
                <CommandToolbar
                    activeCommandId={activeCommandId}
                    commandAvailability={commandAvailability}
                    onActivateCommand={(commandId) => {
                        interactionControllerRef.current?.activateCommand(commandId);
                    }}
                />
                <ViewToolbar
                    onFitView={() => {
                        animateFitView();
                    }}
                    onStandardView={(view) => {
                        animateStandardView(view);
                    }}
                />
            </header>

            <WorkbenchLayout
                modelTreePanel={
                    <ModelTreePanel
                        document={editorState.document}
                        onSelectObject={(objectId) => {
                            setEditorState((current) =>
                                new EditorController(current).replaceSelection({
                                    objectId,
                                    primitiveId: null,
                                    targetKind: 'object',
                                }),
                            );
                        }}
                        partStudio={activePartStudio}
                        selectedObjectIds={selectedObjectIds}
                    />
                }
                viewport={
                    <CadViewport
                        activeCommandLabel={activeCommandLabel}
                        canvasRef={canvasRef}
                        displayObjectCount={countSceneRenderObjects(renderGraph)}
                        documentName={editorState.document.name}
                        rendererStatus={rendererStatus}
                    />
                }
                inspectorPanel={
                    <InspectorPanel
                        activeCommandLabel={activeCommandLabel}
                        activeSketchSession={editorState.activeSketchSession}
                        commandSession={editorState.commandSession}
                        partStudio={activePartStudio}
                        selectedObjects={selectedObjects}
                        selectedTarget={selectedTarget}
                    />
                }
            />
        </main>
    );
}

function countSceneRenderObjects(graph: RenderGraph): number {
    return graph.layers.reduce((total, layer) => {
        if (!layer.visible || layer.depthPolicy === 'overlay') {
            return total;
        }

        return total + layer.objects.filter((object) => object.visible).length;
    }, 0);
}

function getScreenPoint(canvas: HTMLCanvasElement, event: MouseEvent): ScreenPoint {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

function getCanvasViewportSize(canvas: HTMLCanvasElement) {
    return getContentRectViewportSize(canvas.getBoundingClientRect());
}

function getContentRectViewportSize(rect: Pick<DOMRectReadOnly, 'height' | 'width'>) {
    return {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
    };
}

function isTextInputTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
    );
}

function releasePointerCaptureIfNeeded(canvas: HTMLCanvasElement, pointerId: number): void {
    if (canvas.hasPointerCapture(pointerId)) {
        canvas.releasePointerCapture(pointerId);
    }
}

function toEditorKeyInput(event: KeyboardEvent): EditorKeyInput {
    return {
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        targetIsTextInput: isTextInputTarget(event.target),
    };
}

function toEditorPointerInput(canvas: HTMLCanvasElement, event: PointerEvent): EditorPointerInput {
    return toEditorPointerInputFromPoint(event, getScreenPoint(canvas, event));
}

function toEditorPointerInputFromPoint(
    event: PointerEvent,
    point: ScreenPoint,
): EditorPointerInput {
    return {
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        pointerId: event.pointerId,
        point,
    };
}

function toEditorWheelInput(canvas: HTMLCanvasElement, event: WheelEvent): EditorWheelInput {
    return {
        deltaY: event.deltaY,
        point: getScreenPoint(canvas, event),
    };
}

function isViewCubeArrowTarget(targetId: ViewCubeTargetId): targetId is ViewCubeArrowCommand {
    return VIEW_CUBE_ARROW_TARGETS.has(targetId);
}

function getViewCubeRotationStep(event: PointerEvent): ViewCubeRotationStep {
    if (event.shiftKey) {
        return 'coarse';
    }

    if (event.ctrlKey || event.metaKey) {
        return 'fine';
    }

    return 'default';
}
