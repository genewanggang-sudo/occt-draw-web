import type { CadDocument, EditDraft } from '@occt-draw/core';
import type { Sketch, SketchEntityId, SketchId } from '@occt-draw/sketch';
import type { CommandSession } from '../commands/commandTypes';
import type { SelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';

export interface SketchDocumentStore {
    readonly sketchesById: Readonly<Record<SketchId, Sketch>>;
}

export interface SketchEditSession {
    readonly activeTool: 'line' | 'select';
    readonly pendingLineStartPointId: SketchEntityId | null;
    readonly sketchId: SketchId;
}

export interface EditorState {
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly document: CadDocument;
    readonly draft: EditDraft | null;
    readonly navigation: ViewNavigationState;
    readonly selection: SelectionState;
    readonly sketches: SketchDocumentStore;
}
