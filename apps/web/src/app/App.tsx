import { createDefaultCadDocument, getActivePartStudio } from '@occt-draw/core';
import {
    calculateSceneBoundingBox,
    calculateSceneBoundingSphere,
    createStandardCameraState,
    type CadRenderer,
    type RenderHighlightState,
} from '@occt-draw/renderer';
import { createWebglRenderer } from '@occt-draw/renderer-webgl';
import { createSceneDocumentFromPartStudio } from '@occt-draw/scene';
import { APP_NAME } from '@occt-draw/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PickService } from '../editor/application/PickService';
import { ViewNavigationController } from '../editor/application/ViewNavigationController';
import { ViewportInputAdapter } from '../editor/application/ViewportInputAdapter';
import { ViewportInteractionController } from '../editor/application/ViewportInteractionController';
import { CommandToolbar } from '../editor/commands/CommandToolbar';
import { getCommandLabel } from '../editor/commands/commandRegistry';
import { createInitialEditorState } from '../editor/state/createInitialEditorState';
import type { EditorState } from '../editor/state/editorState';
import { createViewNavigationState } from '../editor/view-navigation/viewNavigation';
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
        const scene = createSceneDocumentFromPartStudio(activePartStudio);
        const sceneBounds = calculateSceneBoundingBox(scene);
        const sceneSphere = calculateSceneBoundingSphere(scene);
        const camera = createStandardCameraState(sceneBounds, 'isometric', INITIAL_VIEWPORT_SIZE);
        const navigation = createViewNavigationState(camera, sceneSphere, INITIAL_VIEWPORT_SIZE);

        return createInitialEditorState({
            document,
            navigation,
        });
    });
    const [rendererStatus, setRendererStatus] = useState('正在初始化 WebGL');

    const activePartStudio = useMemo(
        () => getActivePartStudio(editorState.document),
        [editorState.document],
    );
    const scene = useMemo(
        () => createSceneDocumentFromPartStudio(activePartStudio),
        [activePartStudio],
    );
    const sceneBounds = useMemo(() => calculateSceneBoundingBox(scene), [scene]);
    const sceneSphere = useMemo(() => calculateSceneBoundingSphere(scene), [scene]);
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
            selectedObjectIds,
        }),
        [
            editorState.selection.hoveredObjectId,
            editorState.selection.preselectedTarget,
            selectedObjectIds,
        ],
    );
    const activeCommandId = editorState.commandSession.id;
    const activeCommandLabel = getCommandLabel(activeCommandId);

    const editorStateRef = useRef(editorState);
    const sceneRef = useRef(scene);
    const sceneBoundsRef = useRef(sceneBounds);
    const sceneSphereRef = useRef(sceneSphere);
    const activeCommandIdRef = useRef(activeCommandId);

    useEffect(() => {
        editorStateRef.current = editorState;
        sceneRef.current = scene;
        sceneBoundsRef.current = sceneBounds;
        sceneSphereRef.current = sceneSphere;
        activeCommandIdRef.current = activeCommandId;
    }, [activeCommandId, editorState, scene, sceneBounds, sceneSphere]);

    const interactionControllerRef = useRef<ViewportInteractionController | null>(null);

    interactionControllerRef.current ??= new ViewportInteractionController({
        getActiveCommandId: () => activeCommandIdRef.current,
        getScene: () => sceneRef.current,
        getSceneBounds: () => sceneBoundsRef.current,
        getSceneSphere: () => sceneSphereRef.current,
        getState: () => editorStateRef.current,
        pickService: pickServiceRef.current,
        setState: (updater) => {
            setEditorState(updater);
        },
    });

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        try {
            rendererRef.current = createWebglRenderer(canvas);
            setRendererStatus('WebGL 已就绪');
        } catch (error) {
            setRendererStatus(error instanceof Error ? error.message : '当前浏览器不支持 WebGL');
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

            const viewportSize = {
                width: Math.max(1, Math.round(entry.contentRect.width)),
                height: Math.max(1, Math.round(entry.contentRect.height)),
            };

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
                interactionControllerRef.current?.handleKeyDown(event);
            },
            onPointerCancel(event) {
                interactionControllerRef.current?.handlePointerCancel(canvas, event);
            },
            onPointerDown(event) {
                interactionControllerRef.current?.handlePointerDown(canvas, event);
            },
            onPointerMove(event) {
                interactionControllerRef.current?.handlePointerMove(canvas, event);
            },
            onPointerUp(event) {
                interactionControllerRef.current?.handlePointerUp(canvas, event);
            },
            onWheel(event) {
                interactionControllerRef.current?.handleWheel(canvas, event);
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
            highlight: renderHighlight,
            scene,
            viewportSize: editorState.navigation.viewportSize,
        });
    }, [
        editorState.navigation.camera,
        editorState.navigation.viewportSize,
        renderHighlight,
        scene,
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
                        partStudio={activePartStudio}
                        selectedObjectIds={selectedObjectIds}
                    />
                }
                viewport={
                    <CadViewport
                        activeCommandLabel={activeCommandLabel}
                        canvasRef={canvasRef}
                        documentName={editorState.document.name}
                        rendererStatus={rendererStatus}
                        sceneObjectCount={scene.objects.length}
                    />
                }
                inspectorPanel={
                    <InspectorPanel
                        activeCommandLabel={activeCommandLabel}
                        selectedObjects={selectedObjects}
                        selectedTarget={selectedTarget}
                    />
                }
            />
        </main>
    );
}
