import { CadCanvasAdapter } from '@occt-draw/cad-canvas';
import { renderCanvasSceneToGraph } from '@occt-draw/canvas';
import type { CadDocument } from '@occt-draw/cad-model';
import type { RenderGraph, RenderHighlightState } from '@occt-draw/canvas';
import { SketchEntityKind } from '@occt-draw/sketch';
import type { EditorState } from '../state/editorState';
import { getSketchEntityRefFromSelectionTarget } from '../selection/sketchSelection';

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
    const preselectedTarget = state.selection.preselectedTarget;

    return {
        hoveredObjectId: state.selection.hoveredObjectId,
        preselectedObjectId: preselectedTarget?.objectId ?? null,
        preselectedPrimitiveId: getHighlightPrimitiveId(preselectedTarget),
        selectedObjectIds: state.selection.selection.objectIds,
        selectedPrimitiveId: getHighlightPrimitiveId(selectedTarget),
    };
}

function getHighlightPrimitiveId(
    target: EditorState['selection']['preselectedTarget'],
): string | null {
    const sketchEntityRef = getSketchEntityRefFromSelectionTarget(target);

    return sketchEntityRef?.kind === SketchEntityKind.Curve ? null : (target?.primitiveId ?? null);
}
