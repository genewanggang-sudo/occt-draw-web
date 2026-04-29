import { projectPartStudioToDisplayModel } from '@occt-draw/display';
import { createDefaultCadDocument, getActivePartStudio } from '@occt-draw/core';
import {
    createInitialEditorState,
    createViewNavigationState,
    EditorController,
    evaluateCommandAvailabilityMap,
    getCommandLabel,
    PickService,
    ViewNavigationController,
    ViewportInteractionController,
    type EditorKeyInput,
    type EditorPointerInput,
    type EditorState,
    type EditorWheelInput,
    type ScreenPoint,
} from '@occt-draw/editor';
import {
    calculateDisplayNavigationBoundingBox,
    calculateDisplayNavigationBoundingSphere,
    createStandardCameraState,
    type CadRenderer,
    type RenderHighlightState,
} from '@occt-draw/renderer';
import { createWebglRenderer } from '@occt-draw/renderer-webgl';
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

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<CadRenderer | null>(null);
    const pickServiceRef = useRef(new PickService());
    const [editorState, setEditorState] = useState<EditorState>(() => {
        const document = createDefaultCadDocument();
        const activePartStudio = getActivePartStudio(document);
        const displayModel = projectPartStudioToDisplayModel(activePartStudio);
        const displayBounds = calculateDisplayNavigationBoundingBox(displayModel);
        const displaySphere = calculateDisplayNavigationBoundingSphere(displayModel);
        const camera = createStandardCameraState(displayBounds, 'isometric', INITIAL_VIEWPORT_SIZE);
        const navigation = createViewNavigationState(camera, displaySphere, INITIAL_VIEWPORT_SIZE);

        return createInitialEditorState({
            document,
            navigation,
        });
    });
    const [rendererStatus, setRendererStatus] = useState('正在初始化 WebGL2');

    const activePartStudio = useMemo(
        () => getActivePartStudio(editorState.document),
        [editorState.document],
    );
    const displayModel = useMemo(
        () =>
            projectPartStudioToDisplayModel(activePartStudio, editorState.draft, {
                sketchesById: editorState.sketches.sketchesById,
            }),
        [activePartStudio, editorState.draft, editorState.sketches.sketchesById],
    );
    const displayBounds = useMemo(
        () => calculateDisplayNavigationBoundingBox(displayModel),
        [displayModel],
    );
    const displaySphere = useMemo(
        () => calculateDisplayNavigationBoundingSphere(displayModel),
        [displayModel],
    );
    const selectedObjectIds = editorState.selection.selection.objectIds;
    const selectedTarget = editorState.selection.selection.primaryTarget;
    const selectedObjects = useMemo(
        () => activePartStudio.objects.filter((object) => selectedObjectIds.includes(object.id)),
        [activePartStudio.objects, selectedObjectIds],
    );
    const renderHighlight = useMemo<RenderHighlightState>(
        () => ({
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

    const editorStateRef = useRef(editorState);
    const displayModelRef = useRef(displayModel);
    const displayBoundsRef = useRef(displayBounds);
    const displaySphereRef = useRef(displaySphere);
    const activeCommandIdRef = useRef(activeCommandId);

    useEffect(() => {
        editorStateRef.current = editorState;
        displayModelRef.current = displayModel;
        displayBoundsRef.current = displayBounds;
        displaySphereRef.current = displaySphere;
        activeCommandIdRef.current = activeCommandId;
    }, [activeCommandId, displayBounds, displayModel, displaySphere, editorState]);

    const interactionControllerRef = useRef<ViewportInteractionController | null>(null);

    interactionControllerRef.current ??= new ViewportInteractionController({
        getActiveCommandId: () => activeCommandIdRef.current,
        getDisplayBounds: () => displayBoundsRef.current,
        getDisplayModel: () => displayModelRef.current,
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
            rendererRef.current = createWebglRenderer(canvas);
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
                const handled = interactionControllerRef.current?.handleKeyDown(
                    toEditorKeyInput(event),
                );

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerCancel(event) {
                const handled = interactionControllerRef.current?.handlePointerCancel(
                    toEditorPointerInput(canvas, event),
                );
                releasePointerCaptureIfNeeded(canvas, event.pointerId);

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerDown(event) {
                const handled = interactionControllerRef.current?.handlePointerDown(
                    toEditorPointerInput(canvas, event),
                );

                if (handled) {
                    canvas.setPointerCapture(event.pointerId);
                    event.preventDefault();
                }
            },
            onPointerMove(event) {
                const handled = interactionControllerRef.current?.handlePointerMove(
                    toEditorPointerInput(canvas, event),
                );

                if (handled) {
                    event.preventDefault();
                }
            },
            onPointerUp(event) {
                const handled = interactionControllerRef.current?.handlePointerUp(
                    toEditorPointerInput(canvas, event),
                );
                releasePointerCaptureIfNeeded(canvas, event.pointerId);

                if (handled) {
                    event.preventDefault();
                }
            },
            onWheel(event) {
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
        rendererRef.current?.render({
            camera: editorState.navigation.camera,
            displayModel,
            highlight: renderHighlight,
            viewportSize: editorState.navigation.viewportSize,
        });
    }, [
        displayModel,
        editorState.navigation.camera,
        editorState.navigation.viewportSize,
        renderHighlight,
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
                        interactionControllerRef.current?.fitView();
                    }}
                    onStandardView={(view) => {
                        interactionControllerRef.current?.handleStandardView(view);
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
                        sketchesById={editorState.sketches.sketchesById}
                    />
                }
                viewport={
                    <CadViewport
                        activeCommandLabel={activeCommandLabel}
                        canvasRef={canvasRef}
                        displayObjectCount={displayModel.objects.length}
                        documentName={editorState.document.name}
                        rendererStatus={rendererStatus}
                    />
                }
                inspectorPanel={
                    <InspectorPanel
                        activeCommandLabel={activeCommandLabel}
                        activeSketchSession={editorState.activeSketchSession}
                        commandSession={editorState.commandSession}
                        selectedObjects={selectedObjects}
                        selectedTarget={selectedTarget}
                        sketchesById={editorState.sketches.sketchesById}
                    />
                }
            />
        </main>
    );
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
    return {
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        pointerId: event.pointerId,
        point: getScreenPoint(canvas, event),
    };
}

function toEditorWheelInput(canvas: HTMLCanvasElement, event: WheelEvent): EditorWheelInput {
    return {
        deltaY: event.deltaY,
        point: getScreenPoint(canvas, event),
    };
}
