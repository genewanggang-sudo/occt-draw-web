import type { CadDocument, EditDraft } from '@occt-draw/core';
import type { SketchVertexId } from '@occt-draw/sketch';
import type { CommandSession } from '../commands/commandTypes';
import type { SelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';

export interface SketchEditSession {
    readonly activeTool: 'line' | 'select';
    readonly pendingLineStartVertexId: SketchVertexId | null;
    readonly sketchFeatureId: string;
}

export interface EditorState {
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly document: CadDocument;
    readonly draft: EditDraft | null;
    readonly navigation: ViewNavigationState;
    readonly selection: SelectionState;
}
