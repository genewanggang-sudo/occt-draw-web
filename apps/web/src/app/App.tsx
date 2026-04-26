import {
    calculateSceneBoundingBox,
    calculateSceneBoundingSphere,
    createCameraStateForScene,
    createStandardCameraState,
    fitCameraToBounds,
    type CadRenderer,
    type CameraState,
    type StandardCameraView,
    type ViewportSize,
} from '@occt-draw/renderer';
import { createWebglRenderer } from '@occt-draw/renderer-webgl';
import { createDefaultSceneDocument } from '@occt-draw/scene';
import { APP_NAME } from '@occt-draw/shared';
import {
    beginViewNavigation,
    createViewNavigationState,
    endViewNavigation,
    updateViewNavigation,
    updateViewNavigationCamera,
    updateViewNavigationViewport,
    zoomViewNavigation,
    type ScreenPoint,
    type ViewNavigationState,
} from '../editor/view-navigation/viewNavigation';
import { ViewToolbar } from '../editor/view-toolbar/ViewToolbar';
import { CadViewport } from '../editor/viewport/CadViewport';
import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || APP_NAME;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<CadRenderer | null>(null);
    const scene = useMemo(() => createDefaultSceneDocument(), []);
    const sceneBounds = useMemo(() => calculateSceneBoundingBox(scene), [scene]);
    const sceneSphere = useMemo(() => calculateSceneBoundingSphere(scene), [scene]);
    const initialCamera = useMemo(() => createCameraStateForScene(scene), [scene]);
    const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 1, height: 1 });
    const [rendererStatus, setRendererStatus] = useState('正在初始化 WebGL');
    const [navigation, setNavigation] = useState<ViewNavigationState>(() =>
        createViewNavigationState(initialCamera, sceneSphere, viewportSize),
    );

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

            setViewportSize({
                width: Math.max(1, Math.round(entry.contentRect.width)),
                height: Math.max(1, Math.round(entry.contentRect.height)),
            });
        });

        observer.observe(canvas);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        setNavigation((current) => updateViewNavigationViewport(current, viewportSize));
    }, [viewportSize]);

    useEffect(() => {
        rendererRef.current?.render({
            camera: navigation.camera,
            scene,
            viewportSize,
        });
    }, [navigation.camera, scene, viewportSize]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent): void {
            if (shouldIgnoreShortcut(event)) {
                return;
            }

            if (event.key === 'f' || event.key === 'F') {
                event.preventDefault();
                applyCamera(fitCameraToBounds(navigation.camera, sceneBounds, viewportSize));
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigation.camera, sceneBounds, sceneSphere, viewportSize]);

    function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
        if (!isViewNavigationPointer(event)) {
            return;
        }

        const canvas = event.currentTarget;

        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);

        const point = getScreenPoint(canvas, event);

        setNavigation((current) =>
            beginViewNavigation(current, {
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point,
            }),
        );
    }

    function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
        const canvas = event.currentTarget;

        event.preventDefault();

        const point = getScreenPoint(canvas, event);

        setNavigation((current) =>
            updateViewNavigation(current, {
                button: event.button,
                ctrlKey: event.ctrlKey,
                pointerId: event.pointerId,
                point,
            }),
        );
    }

    function handlePointerUp(event: PointerEvent<HTMLCanvasElement>): void {
        const canvas = event.currentTarget;

        event.preventDefault();

        setNavigation((current) => endViewNavigation(current, event.pointerId));

        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    }

    function handleWheel(event: WheelEvent<HTMLCanvasElement>): void {
        const canvas = event.currentTarget;

        event.preventDefault();

        const point = getScreenPoint(canvas, event);

        setNavigation((current) =>
            zoomViewNavigation(current, {
                deltaY: event.deltaY,
                point,
            }),
        );
    }

    function applyCamera(camera: CameraState): void {
        setNavigation((current) => updateViewNavigationCamera(current, camera, sceneSphere));
    }

    function handleFitView(): void {
        applyCamera(fitCameraToBounds(navigation.camera, sceneBounds, viewportSize));
    }

    function handleStandardView(view: StandardCameraView): void {
        applyCamera(createStandardCameraState(sceneBounds, view, viewportSize));
    }

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
                <ViewToolbar onFitView={handleFitView} onStandardView={handleStandardView} />
            </header>

            <CadViewport
                canvasRef={canvasRef}
                onPointerCancel={handlePointerUp}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                rendererStatus={rendererStatus}
                sceneObjectCount={scene.objects.length}
            />
        </main>
    );
}

function isViewNavigationPointer(event: PointerEvent<HTMLCanvasElement>): boolean {
    return event.button === 1 || event.button === 2;
}

function getScreenPoint(
    canvas: HTMLCanvasElement,
    event: PointerEvent<HTMLCanvasElement> | WheelEvent<HTMLCanvasElement>,
): ScreenPoint {
    const bounds = canvas.getBoundingClientRect();

    return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
    };
}

function shouldIgnoreShortcut(event: KeyboardEvent): boolean {
    if (event.altKey || event.ctrlKey || event.metaKey) {
        return true;
    }

    const target = event.target;

    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA'
    );
}
