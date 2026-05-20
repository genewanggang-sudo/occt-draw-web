import type { CadDocument } from '@occt-draw/cad-model';
import type { EditDraft } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';
import type { SelectionState, ViewNavigationState } from '@occt-draw/platform';
import type { SketchVertexId } from '@occt-draw/sketch';
import type { CommandSession } from '../commands/commandTypes';

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
