import { CadDocumentEditContext, type SketchEditTarget } from '@occt-draw/cad-model';
import type { EditorState, SketchEditSession } from '../state/editorState';

export function resolveActiveSketchTarget(
    state: EditorState,
    session: SketchEditSession,
): SketchEditTarget | null {
    try {
        return CadDocumentEditContext.begin(state.document, {
            id: `resolve-sketch-target:${session.sketchFeatureId}`,
            label: `Resolve ${session.sketchFeatureId}`,
        }).requireSketchTarget({
            partStudioId: state.document.getActivePartStudio().id,
            sketchFeatureId: session.sketchFeatureId,
        });
    } catch {
        return null;
    }
}
