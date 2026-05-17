import type { CadDocument } from '@occt-draw/cad-model';
import type { EditDraft } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';
import type { SketchVertexId } from '@occt-draw/sketch';
import type { CommandSession } from '../commands/commandTypes';
import type { SelectionState } from '../selection/selectionState';
import type { ViewNavigationState } from '../view-navigation/viewNavigation';

export interface SketchEditSession {
    readonly activeTool: 'line' | 'rectangle' | 'select';
    readonly pendingLineStartVertexId: SketchVertexId | null;
    readonly pendingRectangleStart: Vector2 | null;
    readonly sketchFeatureId: string;
}

export interface EditorState {
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly document: CadDocument;
    readonly draft: EditDraft<CadDocument> | null;
    readonly navigation: ViewNavigationState;
    readonly selection: SelectionState;
}
