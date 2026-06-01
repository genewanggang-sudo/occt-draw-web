import {
    createEditorWorkbenchViewModel,
    createDefaultEditorState,
    EditorController,
    EditorViewportRuntime,
    getCommandLabel,
    type EditorState,
    type EditorViewportRuntimeStatus,
} from '@occt-draw/editor';
import { ToolbarIcon, ToolbarIconId, ToolbarIconSprite } from '@occt-draw/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CommandToolbar } from '../editor/commands/CommandToolbar';
import { SketchEditPanel } from '../editor/sketch/SketchEditPanel';
import { ViewToolbar } from '../editor/view-toolbar/ViewToolbar';
import { CadViewport } from '../editor/viewport/CadViewport';
import { InspectorPanel } from '../editor/workbench/InspectorPanel';
import { ModelTreePanel } from '../editor/workbench/ModelTreePanel';
import { WorkbenchLayout } from '../editor/workbench/WorkbenchLayout';

const DEFAULT_APP_NAME = 'occt-draw-web';

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || DEFAULT_APP_NAME;
    const viewportHostRef = useRef<HTMLDivElement | null>(null);
    const runtimeRef = useRef<EditorViewportRuntime | null>(null);
    const editorStateRef = useRef<EditorState | null>(null);
    const [editorState, setEditorState] = useState<EditorState>(() => createDefaultEditorState());
    const [viewportStatus, setViewportStatus] = useState<EditorViewportRuntimeStatus>({
        displayObjectCount: 0,
        rendererStatus: 'Initializing WebGL2',
    });

    editorStateRef.current = editorState;

    const workbenchView = useMemo(() => createEditorWorkbenchViewModel(editorState), [editorState]);
    const activeCommandId = editorState.commandSession.id;
    const activeCommandLabel = getCommandLabel(activeCommandId);
    const commandAvailability = workbenchView.commandAvailability;
    const isEditingSketch = editorState.activeSketchSession !== null;
    const activeSketch = workbenchView.inspector.activeSketch;

    useEffect(() => {
        const hostElement = viewportHostRef.current;

        if (!hostElement || runtimeRef.current) {
            return;
        }

        const runtime = new EditorViewportRuntime({
            getState: () => {
                if (!editorStateRef.current) {
                    throw new Error('Editor state is not initialized.');
                }

                return editorStateRef.current;
            },
            hostElement,
            onStatusChange: setViewportStatus,
            updateState: (updater) => {
                setEditorState(updater);
            },
        });
        runtimeRef.current = runtime;

        return () => {
            runtime.dispose();
            runtimeRef.current = null;
        };
    }, []);

    useEffect(() => {
        runtimeRef.current?.sync();
    }, [editorState]);

    return (
        <main className={`cad-workbench${isEditingSketch ? ' cad-workbench--sketch' : ''}`}>
            <header
                className={`cad-workbench__topbar${isEditingSketch ? ' cad-workbench__topbar--sketch' : ''}`}
            >
                <ToolbarIconSprite />
                <div className="cad-workbench__brand">
                    <span className="cad-workbench__mark">OC</span>
                    <span className="cad-workbench__title">{appTitle}</span>
                </div>
                <nav
                    className="cad-workbench__actions cad-workbench__history-actions"
                    aria-label="历史操作"
                >
                    <button
                        className="cad-workbench__toolbar-icon-button cad-workbench__history-action"
                        disabled={!editorState.documentSession.canUndo}
                        onClick={() => {
                            setEditorState((current) =>
                                new EditorController(current).undoDocument(),
                            );
                        }}
                        title={editorState.documentSession.undoLabel ?? 'Undo'}
                        type="button"
                        aria-label={editorState.documentSession.undoLabel ?? 'Undo'}
                    >
                        <ToolbarIcon
                            className="cad-workbench__history-action-icon"
                            icon={ToolbarIconId.Undo}
                        />
                    </button>
                    <button
                        className="cad-workbench__toolbar-icon-button cad-workbench__history-action"
                        disabled={!editorState.documentSession.canRedo}
                        onClick={() => {
                            setEditorState((current) =>
                                new EditorController(current).redoDocument(),
                            );
                        }}
                        title={editorState.documentSession.redoLabel ?? 'Redo'}
                        type="button"
                        aria-label={editorState.documentSession.redoLabel ?? 'Redo'}
                    >
                        <ToolbarIcon
                            className="cad-workbench__history-action-icon"
                            icon={ToolbarIconId.Redo}
                        />
                    </button>
                </nav>
                {isEditingSketch ? null : (
                    <nav
                        className="cad-workbench__actions cad-workbench__file-actions"
                        aria-label="基础功能入口"
                    >
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
                )}
                <CommandToolbar
                    activeCommandId={activeCommandId}
                    commandAvailability={commandAvailability}
                    isEditingSketch={isEditingSketch}
                    onActivateCommand={(commandId) => {
                        runtimeRef.current?.activateCommand(commandId);
                    }}
                />
                {isEditingSketch ? null : (
                    <ViewToolbar
                        onFitView={() => {
                            runtimeRef.current?.fitView();
                        }}
                        onStandardView={(view) => {
                            runtimeRef.current?.setStandardView(view);
                        }}
                    />
                )}
            </header>

            <WorkbenchLayout
                modelTreePanel={
                    <ModelTreePanel
                        modelTree={workbenchView.modelTree}
                        onSelectObject={(objectId) => {
                            setEditorState((current) =>
                                new EditorController(current).replaceSelection({
                                    objectId,
                                    primitiveId: null,
                                    targetKind: 'object',
                                }),
                            );
                        }}
                        onEditSketchFeature={(sketchFeatureId) => {
                            setEditorState((current) =>
                                new EditorController(current).editSketchFeature(sketchFeatureId),
                            );
                        }}
                    />
                }
                viewport={
                    <>
                        <CadViewport
                            activeCommandLabel={activeCommandLabel}
                            displayObjectCount={viewportStatus.displayObjectCount}
                            documentName={editorState.document.name}
                            rendererStatus={viewportStatus.rendererStatus}
                            viewportHostRef={viewportHostRef}
                        />
                        {isEditingSketch && activeSketch ? (
                            <SketchEditPanel
                                sketch={activeSketch}
                                onAccept={() => {
                                    setEditorState((current) =>
                                        new EditorController(current).confirmActiveSketchEdit(),
                                    );
                                }}
                                onCancel={() => {
                                    setEditorState((current) =>
                                        new EditorController(current).cancelActiveSketchEdit(),
                                    );
                                }}
                                onDisplayOptionsChange={(displayOptions) => {
                                    setEditorState((current) =>
                                        new EditorController(
                                            current,
                                        ).updateActiveSketchDisplayOptions(displayOptions),
                                    );
                                }}
                            />
                        ) : null}
                    </>
                }
                inspectorPanel={
                    <InspectorPanel
                        activeCommandLabel={activeCommandLabel}
                        commandSession={editorState.commandSession}
                        inspector={workbenchView.inspector}
                    />
                }
            />
        </main>
    );
}
