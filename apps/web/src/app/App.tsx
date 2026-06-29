import {
    Application,
    createDefaultEditorState,
    createEditorWorkbenchViewModel,
    EditorController,
    getCommandLabel,
    type EditorState,
    type EditorViewportStatus,
} from '@occt-draw/editor';
import { ToolbarIcon, ToolbarIconId, ToolbarIconSprite } from '@occt-draw/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CommandToolbar } from '../editor/commands/CommandToolbar';
import { SketchEditPanel } from '../editor/sketch/SketchEditPanel';
import { CadViewport } from '../editor/viewport/CadViewport';
import { InspectorPanel } from '../editor/workbench/InspectorPanel';
import { ModelTreePanel } from '../editor/workbench/ModelTreePanel';
import { WorkbenchLayout } from '../editor/workbench/WorkbenchLayout';
import { openDocumentFromFile, saveDocumentToFile } from './documentFileIO';

const DEFAULT_APP_NAME = 'occt-draw-web';
type FileOperationState = 'idle' | 'opening' | 'saving';

export function App() {
    const appTitle = import.meta.env.VITE_APP_TITLE || DEFAULT_APP_NAME;
    const applicationRef = useRef<Application | null>(null);
    const viewportHostRef = useRef<HTMLDivElement | null>(null);
    const editorStateRef = useRef<EditorState | null>(null);
    const [editorState, setEditorState] = useState<EditorState>(() => createDefaultEditorState());
    const [viewportStatus, setViewportStatus] = useState<EditorViewportStatus>({
        displayObjectCount: 0,
        rendererStatus: 'Initializing WebGL2',
    });
    const [fileOperation, setFileOperation] = useState<FileOperationState>('idle');
    const [fileMessage, setFileMessage] = useState<string | null>(null);

    editorStateRef.current = editorState;

    const workbenchView = useMemo(() => createEditorWorkbenchViewModel(editorState), [editorState]);
    const activeCommandId = editorState.commandSession.id;
    const activeCommandLabel = getCommandLabel(activeCommandId);
    const commandAvailability = workbenchView.commandAvailability;
    const isEditingSketch = editorState.activeSketchSession !== null;
    const activeSketch = workbenchView.inspector.activeSketch;
    const isFileOperationBusy = fileOperation !== 'idle';

    useEffect(() => {
        const hostElement = viewportHostRef.current;

        if (!hostElement || applicationRef.current) {
            return;
        }

        const application = new Application({
            getState: () => {
                if (!editorStateRef.current) {
                    throw new Error('Editor state is not initialized.');
                }

                return editorStateRef.current;
            },
            updateState: (updater) => {
                setEditorState(updater);
            },
        });
        application.initCanvas({
            hostElement,
            onStatusChange: setViewportStatus,
        });
        applicationRef.current = application;

        return () => {
            application.dispose();
            applicationRef.current = null;
        };
    }, []);

    useEffect(() => {
        applicationRef.current?.syncViewport();
    }, [editorState]);

    async function handleOpenDocument(): Promise<void> {
        const currentState = editorStateRef.current;

        if (
            currentState?.documentSession.canUndo &&
            !window.confirm(
                '\u6253\u5f00\u6587\u6863\u4f1a\u66ff\u6362\u5f53\u524d\u672a\u4fdd\u5b58\u7684\u66f4\u6539\u3002\u662f\u5426\u7ee7\u7eed\uff1f',
            )
        ) {
            return;
        }

        setFileOperation('opening');
        setFileMessage(null);

        const result = await openDocumentFromFile();

        if (result.ok) {
            if (applicationRef.current) {
                applicationRef.current.replaceDocument(result.document);
            } else {
                setEditorState((current) =>
                    new EditorController(current).replaceDocument(result.document),
                );
            }
            setFileMessage('\u6587\u6863\u5df2\u6253\u5f00');
        } else if (result.reason === 'error') {
            setFileMessage(result.message ?? '\u6253\u5f00\u5931\u8d25');
        }

        setFileOperation('idle');
    }

    async function handleSaveDocument(): Promise<void> {
        const currentState = editorStateRef.current;

        if (!currentState) {
            return;
        }

        setFileOperation('saving');
        setFileMessage(null);

        const result = await saveDocumentToFile(currentState.document);

        if (result.ok) {
            setFileMessage('\u6587\u6863\u5df2\u4fdd\u5b58');
        } else if (result.reason === 'error') {
            setFileMessage(result.message ?? '\u4fdd\u5b58\u5931\u8d25');
        }

        setFileOperation('idle');
    }

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
                {isEditingSketch ? null : (
                    <button className="cad-workbench__menu-trigger" type="button" aria-label="Menu">
                        <span />
                        <span />
                        <span />
                    </button>
                )}
                <nav
                    className="cad-workbench__actions cad-workbench__history-actions"
                    aria-label="History"
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
                        className="cad-workbench__actions cad-workbench__file-actions cad-workbench__app-menu-panel"
                        aria-label="File actions"
                    >
                        <button
                            className="cad-workbench__action"
                            disabled={isFileOperationBusy}
                            onClick={() => {
                                void handleOpenDocument();
                            }}
                            type="button"
                        >
                            {fileOperation === 'opening' ? '\u6253\u5f00\u4e2d' : '\u6253\u5f00'}
                        </button>
                        <button
                            className="cad-workbench__action"
                            disabled={isFileOperationBusy}
                            onClick={() => {
                                void handleSaveDocument();
                            }}
                            type="button"
                        >
                            {fileOperation === 'saving' ? '\u4fdd\u5b58\u4e2d' : '\u4fdd\u5b58'}
                        </button>
                        {fileMessage ? (
                            <span className="cad-workbench__file-status">{fileMessage}</span>
                        ) : null}
                    </nav>
                )}
                <CommandToolbar
                    activeCommandId={activeCommandId}
                    commandAvailability={commandAvailability}
                    isEditingSketch={isEditingSketch}
                    onActivateCommand={(commandId) => {
                        applicationRef.current?.activateCommand(commandId);
                    }}
                />
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
