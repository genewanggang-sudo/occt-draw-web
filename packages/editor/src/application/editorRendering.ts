import { CadCanvasAdapter } from '@occt-draw/cad-render-adapter';
import { renderCanvasSceneToGraph } from '@occt-draw/canvas';
import type { CadDocument } from '@occt-draw/cad-model';
import type { RenderGraph, RenderHighlightState } from '@occt-draw/webgl-engine';
import type { EditorState } from '../state/editorState';

const cadCanvasAdapter = new CadCanvasAdapter();

export function getEditorDisplayDocument(state: EditorState): CadDocument {
    return state.draft?.workingDocument ?? state.document;
}

export function createEditorRenderGraph(state: EditorState): RenderGraph {
    return renderCanvasSceneToGraph(
        cadCanvasAdapter.createScene({
            activeSketchFeatureId: state.activeSketchSession?.sketchFeatureId ?? null,
            document: getEditorDisplayDocument(state),
            draft: state.draft,
        }),
    );
}

export function createEditorRenderHighlight(state: EditorState): RenderHighlightState {
    const selectedTarget = state.selection.selection.primaryTarget;

    return {
        hoveredObjectId: state.selection.hoveredObjectId,
        preselectedObjectId: state.selection.preselectedTarget?.objectId ?? null,
        preselectedPrimitiveId: state.selection.preselectedTarget?.primitiveId ?? null,
        selectedObjectIds: state.selection.selection.objectIds,
        selectedPrimitiveId: selectedTarget?.primitiveId ?? null,
    };
}
