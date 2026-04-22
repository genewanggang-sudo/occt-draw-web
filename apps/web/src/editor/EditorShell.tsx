import {
    addEntityToDocument,
    createArcEntity,
    createDocumentId,
    createDrawingDocument,
    createDraftToolState,
    createEntityId,
    createLineEntity,
    createPolylineEntity,
    createSelectionState,
    createViewportState,
    type ArcEntity,
    type DraftToolState,
    type DrawingDocument,
    type DrawingEntity,
    type EditorTool,
    type Point2D,
    type SelectionState,
    type ViewportState,
} from '@occt-draw/core';
import {
    hitTestDocument,
    renderDocument,
    screenToWorld,
    type CanvasSize,
} from '@occt-draw/renderer';
import {
    UiBadge,
    UiButton,
    UiDataField,
    UiPanel,
    UiPill,
    UiStatChip,
    UiStatusCard,
} from '@occt-draw/ui';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { clamp, formatPoint } from '../shared/format';

interface EditorShellProps {
    appTitle: string;
    wasmEntry: string;
}

interface PanningState {
    pointerOrigin: Point2D;
    viewportOrigin: Point2D;
}

interface ToolOption {
    tool: EditorTool;
    label: string;
}

const TOOL_OPTIONS: readonly ToolOption[] = [
    { tool: 'select', label: 'Select' },
    { tool: 'draw-line', label: 'Line' },
    { tool: 'draw-arc', label: 'Arc' },
    { tool: 'draw-polyline', label: 'Polyline' },
];

const INITIAL_DOCUMENT_NAME = 'Drawing 001';
const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 960, height: 640 };

export function EditorShell({ appTitle, wasmEntry }: EditorShellProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const panDidMoveRef = useRef(false);

    const [document, setDocument] = useState<DrawingDocument>(() =>
        createDrawingDocument(createDocumentId(), INITIAL_DOCUMENT_NAME),
    );
    const [selection, setSelection] = useState<SelectionState>(() => createSelectionState());
    const [viewport, setViewport] = useState<ViewportState>(() => createViewportState());
    const [activeTool, setActiveTool] = useState<EditorTool>('select');
    const [draftState, setDraftState] = useState<DraftToolState>(() =>
        createDraftToolState('select'),
    );
    const [cursorWorldPoint, setCursorWorldPoint] = useState<Point2D | null>(null);
    const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
    const [panningState, setPanningState] = useState<PanningState | null>(null);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (!entry) {
                return;
            }

            setCanvasSize({
                width: Math.max(320, Math.round(entry.contentRect.width)),
                height: Math.max(360, Math.round(entry.contentRect.height)),
            });
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;

        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas 2D context is not available.');
        }

        renderDocument(context, document, viewport, {
            selectedEntityIds: selection.entityIds,
            draftState,
        });
    }, [canvasSize, document, draftState, selection.entityIds, viewport]);

    const selectedEntity = getSelectedEntity(document, selection);
    const instructions = getToolInstructions(activeTool, draftState);
    const canvasCursor = getCanvasCursor(activeTool, panningState !== null);

    function setTool(tool: EditorTool) {
        setActiveTool(tool);
        setDraftState(createDraftToolState(tool));
    }

    function getWorldPointFromPointer(
        event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>,
    ): Point2D {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Canvas element is not mounted.');
        }

        const rect = canvas.getBoundingClientRect();

        return screenToWorld(
            {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            },
            viewport,
            {
                width: rect.width,
                height: rect.height,
            },
        );
    }

    function getScreenPointFromPointer(event: React.PointerEvent<HTMLCanvasElement>): Point2D {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Canvas element is not mounted.');
        }

        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
        const worldPoint = getWorldPointFromPointer(event);

        setCursorWorldPoint(worldPoint);

        if (panningState) {
            const screenPoint = getScreenPointFromPointer(event);
            const deltaX = screenPoint.x - panningState.pointerOrigin.x;
            const deltaY = screenPoint.y - panningState.pointerOrigin.y;

            if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                panDidMoveRef.current = true;
            }

            setViewport((currentViewport) => ({
                ...currentViewport,
                center: {
                    x: panningState.viewportOrigin.x - deltaX / currentViewport.zoom,
                    y: panningState.viewportOrigin.y - deltaY / currentViewport.zoom,
                },
            }));

            return;
        }

        setDraftState((currentDraftState) => updateDraftPreview(currentDraftState, worldPoint));
    }

    function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
        if (event.button !== 0 || activeTool !== 'select') {
            return;
        }

        const worldPoint = getWorldPointFromPointer(event);
        const hitEntityId = hitTestDocument(document, worldPoint, 8 / viewport.zoom);

        if (hitEntityId) {
            return;
        }

        panDidMoveRef.current = false;
        setPanningState({
            pointerOrigin: getScreenPointFromPointer(event),
            viewportOrigin: viewport.center,
        });
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
        if (!panningState) {
            return;
        }

        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setPanningState(null);
    }

    function handlePointerLeave() {
        setCursorWorldPoint(null);
    }

    function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
        const worldPoint = getWorldPointFromPointer(event);

        if (activeTool === 'select') {
            if (panDidMoveRef.current) {
                panDidMoveRef.current = false;
                return;
            }

            const hitEntityId = hitTestDocument(document, worldPoint, 8 / viewport.zoom);

            setSelection(hitEntityId ? { entityIds: [hitEntityId] } : createSelectionState());
            return;
        }

        if (activeTool === 'draw-line') {
            setDraftState((currentDraftState) => {
                if (currentDraftState.tool !== 'draw-line' || !currentDraftState.start) {
                    return {
                        tool: 'draw-line',
                        start: worldPoint,
                        current: worldPoint,
                    };
                }

                const nextLineEntity = createLineEntity(
                    createEntityId('line'),
                    currentDraftState.start,
                    worldPoint,
                );

                setDocument((currentDocument) =>
                    addEntityToDocument(currentDocument, nextLineEntity),
                );
                setSelection({ entityIds: [nextLineEntity.id] });

                return createDraftToolState('draw-line');
            });

            return;
        }

        if (activeTool === 'draw-arc') {
            setDraftState((currentDraftState) => {
                if (currentDraftState.tool !== 'draw-arc' || !currentDraftState.center) {
                    return {
                        tool: 'draw-arc',
                        center: worldPoint,
                        current: worldPoint,
                    };
                }

                if (!currentDraftState.startPoint) {
                    return {
                        tool: 'draw-arc',
                        center: currentDraftState.center,
                        startPoint: worldPoint,
                        current: worldPoint,
                    };
                }

                const nextArcEntity = createArcEntityFromDraft(
                    currentDraftState.center,
                    currentDraftState.startPoint,
                    worldPoint,
                );

                if (!nextArcEntity) {
                    return createDraftToolState('draw-arc');
                }

                setDocument((currentDocument) =>
                    addEntityToDocument(currentDocument, nextArcEntity),
                );
                setSelection({ entityIds: [nextArcEntity.id] });

                return createDraftToolState('draw-arc');
            });

            return;
        }

        if (event.detail > 1) {
            return;
        }

        setDraftState((currentDraftState) => {
            const points =
                currentDraftState.tool === 'draw-polyline' ? currentDraftState.points : [];

            return {
                tool: 'draw-polyline',
                points: [...points, worldPoint],
                current: worldPoint,
            };
        });
    }

    function handleDoubleClick(event: React.MouseEvent<HTMLCanvasElement>) {
        if (activeTool !== 'draw-polyline') {
            return;
        }

        event.preventDefault();

        setDraftState((currentDraftState) => {
            if (currentDraftState.tool !== 'draw-polyline' || currentDraftState.points.length < 2) {
                return createDraftToolState('draw-polyline');
            }

            const nextPolylineEntity = createPolylineEntity(
                createEntityId('polyline'),
                currentDraftState.points,
            );

            setDocument((currentDocument) =>
                addEntityToDocument(currentDocument, nextPolylineEntity),
            );
            setSelection({ entityIds: [nextPolylineEntity.id] });

            return createDraftToolState('draw-polyline');
        });
    }

    function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
        event.preventDefault();

        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const screenPoint = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
        const worldPointBeforeZoom = screenToWorld(screenPoint, viewport, {
            width: rect.width,
            height: rect.height,
        });
        const zoomFactor = event.deltaY < 0 ? 1.12 : 0.9;

        setViewport((currentViewport) => {
            const nextZoom = clamp(currentViewport.zoom * zoomFactor, 0.25, 8);

            return {
                ...currentViewport,
                zoom: nextZoom,
                center: {
                    x: worldPointBeforeZoom.x - (screenPoint.x - rect.width / 2) / nextZoom,
                    y: worldPointBeforeZoom.y - (screenPoint.y - rect.height / 2) / nextZoom,
                },
            };
        });
    }

    function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
        event.preventDefault();
        setDraftState(createDraftToolState(activeTool));
    }

    return (
        <main className="editor-shell">
            <section className="editor-shell__frame">
                <aside className="editor-shell__sidebar">
                    <Panel title={null}>
                        <div className="editor-shell__hero">
                            <UiBadge>Drafting Workbench</UiBadge>
                            <h1 className="editor-shell__hero-title">{appTitle}</h1>
                            <p className="editor-shell__hero-copy">
                                A warm drafting-table shell for quick 2D output experiments while
                                the geometry engine is still being prepared.
                            </p>
                            <div className="editor-shell__hero-grid">
                                <UiStatChip
                                    label="Entities"
                                    value={document.entities.length.toString()}
                                />
                                <UiStatChip label="Zoom" value={`${viewport.zoom.toFixed(2)}x`} />
                                <UiStatChip
                                    label="Mode"
                                    value={
                                        TOOL_OPTIONS.find((option) => option.tool === activeTool)
                                            ?.label ?? 'Select'
                                    }
                                />
                                <UiStatChip label="Bridge" value="Wasm queued" />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Tool Dock">
                        <div className="editor-shell__tool-grid">
                            {TOOL_OPTIONS.map((option) => (
                                <UiButton
                                    active={option.tool === activeTool}
                                    key={option.tool}
                                    onClick={() => {
                                        setTool(option.tool);
                                    }}
                                    type="button"
                                >
                                    {option.label}
                                </UiButton>
                            ))}
                        </div>
                        <p className="occt-ui-note">{instructions}</p>
                    </Panel>

                    <Panel title="Inspector">
                        {selectedEntity ? (
                            <div className="editor-shell__definition-list">
                                <UiDataField label="Id" value={selectedEntity.id} />
                                <UiDataField label="Type" value={selectedEntity.type} />
                                <UiDataField
                                    label="Visible"
                                    value={selectedEntity.visible ? 'Yes' : 'No'}
                                />
                            </div>
                        ) : (
                            <p className="occt-ui-note">
                                Select an entity to inspect its current shape type and visibility.
                            </p>
                        )}
                    </Panel>

                    <Panel title="Telemetry">
                        <div className="editor-shell__definition-list">
                            <UiDataField
                                label="World"
                                value={
                                    cursorWorldPoint
                                        ? formatPoint(cursorWorldPoint)
                                        : 'Move over the canvas'
                                }
                            />
                            <UiDataField label="Draft" value={describeDraftState(draftState)} />
                            <UiDataField
                                label="Wasm"
                                value={wasmEntry ? 'Reserved entry path' : 'Not configured'}
                            />
                        </div>
                    </Panel>
                </aside>

                <section className="editor-shell__canvas-stage">
                    <header className="editor-shell__canvas-header">
                        <div className="editor-shell__canvas-meta">
                            <span className="editor-shell__canvas-label">Active Sheet</span>
                            <strong className="editor-shell__canvas-title">{document.name}</strong>
                        </div>
                        <div className="editor-shell__canvas-tags">
                            <UiPill>Canvas 2D</UiPill>
                            <UiPill>Arc / Line / Polyline</UiPill>
                            <UiPill>Direct Sketching</UiPill>
                        </div>
                    </header>

                    <div className="editor-shell__canvas-board" ref={containerRef}>
                        <div className="editor-shell__canvas-overlay">
                            <h2 className="editor-shell__canvas-overlay-title">Current Session</h2>
                            <p className="editor-shell__canvas-overlay-copy">
                                Draw directly on the board, use the wheel to zoom, and drag empty
                                space in Select mode to move the view.
                            </p>
                        </div>
                        <canvas
                            className="editor-shell__canvas-surface"
                            onClick={handleClick}
                            onContextMenu={handleContextMenu}
                            onDoubleClick={handleDoubleClick}
                            onPointerDown={handlePointerDown}
                            onPointerLeave={handlePointerLeave}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onWheel={handleWheel}
                            ref={canvasRef}
                            style={{
                                cursor: canvasCursor,
                            }}
                        />
                    </div>

                    <footer className="editor-shell__statusbar">
                        <UiStatusCard label="Tool" value={activeTool} />
                        <UiStatusCard
                            label="Cursor"
                            value={cursorWorldPoint ? formatPoint(cursorWorldPoint) : 'Awaiting'}
                        />
                        <UiStatusCard
                            label="Selection"
                            value={selectedEntity ? selectedEntity.type : 'None'}
                        />
                        <UiStatusCard
                            label="Viewport"
                            value={`Center ${formatPoint(viewport.center)}`}
                        />
                    </footer>
                </section>
            </section>
        </main>
    );
}

interface PanelProps {
    children: ReactNode;
    title: string | null;
}

function Panel({ children, title }: PanelProps) {
    if (title) {
        return <UiPanel title={title}>{children}</UiPanel>;
    }

    return <UiPanel>{children}</UiPanel>;
}

function updateDraftPreview(draftState: DraftToolState, point: Point2D): DraftToolState {
    if (draftState.tool === 'draw-line' && draftState.start) {
        return {
            tool: 'draw-line',
            start: draftState.start,
            current: point,
        };
    }

    if (draftState.tool === 'draw-arc' && draftState.center) {
        const nextDraftState: DraftToolState = draftState.startPoint
            ? {
                  tool: 'draw-arc',
                  center: draftState.center,
                  startPoint: draftState.startPoint,
                  current: point,
              }
            : {
                  tool: 'draw-arc',
                  center: draftState.center,
                  current: point,
              };

        return nextDraftState;
    }

    if (draftState.tool === 'draw-polyline' && draftState.points.length > 0) {
        return {
            tool: 'draw-polyline',
            points: draftState.points,
            current: point,
        };
    }

    return draftState;
}

function getSelectedEntity(
    document: DrawingDocument,
    selection: SelectionState,
): DrawingEntity | null {
    const selectedId = selection.entityIds[0];

    if (!selectedId) {
        return null;
    }

    return document.entities.find((entity) => entity.id === selectedId) ?? null;
}

function createArcEntityFromDraft(
    center: Point2D,
    startPoint: Point2D,
    endPoint: Point2D,
): ArcEntity | null {
    const radius = distanceBetween(center, startPoint);

    if (radius < 0.0001) {
        return null;
    }

    const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
    const endAngle = Math.atan2(endPoint.y - center.y, endPoint.x - center.x);
    const normalizedSweep = normalizeAngle(endAngle - startAngle);
    const counterClockwise = normalizedSweep > Math.PI;

    return createArcEntity(
        createEntityId('arc'),
        center,
        radius,
        startAngle,
        endAngle,
        counterClockwise,
    );
}

function distanceBetween(startPoint: Point2D, endPoint: Point2D): number {
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;

    return Math.hypot(deltaX, deltaY);
}

function normalizeAngle(angle: number): number {
    const fullTurn = Math.PI * 2;
    const normalizedAngle = angle % fullTurn;

    return normalizedAngle >= 0 ? normalizedAngle : normalizedAngle + fullTurn;
}

function getToolInstructions(tool: EditorTool, draftState: DraftToolState): string {
    if (tool === 'select') {
        return 'Click an entity to select it. Drag empty space to pan. Use the mouse wheel to zoom.';
    }

    if (tool === 'draw-line') {
        return draftState.tool === 'draw-line' && draftState.start
            ? 'Click again to place the line end point.'
            : 'Click to place the line start point.';
    }

    if (tool === 'draw-arc') {
        if (draftState.tool !== 'draw-arc' || !draftState.center) {
            return 'Click to place the arc center.';
        }

        return draftState.startPoint
            ? 'Click a third point to define the arc end direction.'
            : 'Click a second point to define the arc radius and start direction.';
    }

    return draftState.tool === 'draw-polyline' && draftState.points.length > 0
        ? 'Click to add the next vertex. Double-click to finish the polyline.'
        : 'Click to place the first polyline vertex.';
}

function describeDraftState(draftState: DraftToolState): string {
    if (draftState.tool === 'select') {
        return 'No active draft';
    }

    if (draftState.tool === 'draw-line') {
        return draftState.start ? 'Line in progress' : 'Ready to start a line';
    }

    if (draftState.tool === 'draw-arc') {
        if (!draftState.center) {
            return 'Ready to place center';
        }

        return draftState.startPoint ? 'Ready for arc end' : 'Ready for radius point';
    }

    return draftState.points.length > 0
        ? `${draftState.points.length.toString()} point(s) placed`
        : 'Ready to start a polyline';
}

function getCanvasCursor(tool: EditorTool, isPanning: boolean): CSSProperties['cursor'] {
    if (isPanning) {
        return 'grabbing';
    }

    return tool === 'select' ? 'grab' : 'crosshair';
}
