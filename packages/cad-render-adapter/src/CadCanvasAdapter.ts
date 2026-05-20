import type { CadDocument, PartStudio } from '@occt-draw/cad-model';
import type { CanvasScene } from '@occt-draw/canvas';
import type { EditDraft } from '@occt-draw/core';
import { PartStudioRenderAdapter } from './PartStudioRenderAdapter';

export interface CreateCadCanvasSceneInput {
    readonly activeSketchFeatureId?: string | null;
    readonly document: CadDocument;
    readonly draft?: EditDraft<CadDocument> | null;
}

export interface CreateCadCanvasPartStudioInput {
    readonly activeSketchFeatureId?: string | null;
    readonly draft?: EditDraft<CadDocument> | null;
    readonly partStudio: PartStudio;
}

export class CadCanvasAdapter {
    private readonly partStudioAdapter: PartStudioRenderAdapter;

    constructor(input: { readonly partStudioAdapter?: PartStudioRenderAdapter } = {}) {
        this.partStudioAdapter = input.partStudioAdapter ?? new PartStudioRenderAdapter();
    }

    public createScene(input: CreateCadCanvasSceneInput): CanvasScene {
        return this.createPartStudioScene({
            activeSketchFeatureId: input.activeSketchFeatureId ?? null,
            draft: input.draft ?? null,
            partStudio: input.document.getActivePartStudio(),
        });
    }

    public createPartStudioScene(input: CreateCadCanvasPartStudioInput): CanvasScene {
        return this.partStudioAdapter.createPartStudio(input);
    }
}
