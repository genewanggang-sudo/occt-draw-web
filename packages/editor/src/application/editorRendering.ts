import { getActivePartStudio } from '@occt-draw/cad-model';
import { projectPartStudioToRenderGraph } from '@occt-draw/cad-rendering';
import type { CadDocument } from '@occt-draw/cad-model';
import type { RenderGraph, RenderHighlightState } from '@occt-draw/webgl-engine';
import type { EditorState } from '../state/editorState';

export function getEditorDisplayDocument(state: EditorState): CadDocument {
    return state.draft?.workingDocument ?? state.document;
}

export function createEditorRenderGraph(state: EditorState): RenderGraph {
    return projectPartStudioToRenderGraph(
        getActivePartStudio(getEditorDisplayDocument(state)),
        state.draft,
        {
            activeSketchFeatureId: state.activeSketchSession?.sketchFeatureId ?? null,
        },
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
