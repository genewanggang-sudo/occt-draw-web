import type { CadDocument, PartStudio } from '@occt-draw/cad-model';
import type { EditDraft } from '@occt-draw/core';
import type { CadRenderDocument, CadRenderPartStudio } from '@occt-draw/cad-rendering';
import { PartStudioRenderAdapter } from './PartStudioRenderAdapter';

export interface CreateCadRenderDocumentInput {
    readonly activeSketchFeatureId?: string | null;
    readonly document: CadDocument;
    readonly draft?: EditDraft<CadDocument> | null;
}

export interface CreateCadRenderPartStudioInput {
    readonly activeSketchFeatureId?: string | null;
    readonly draft?: EditDraft<CadDocument> | null;
    readonly partStudio: PartStudio;
}

export class CadRenderAdapter {
    private readonly partStudioAdapter: PartStudioRenderAdapter;

    constructor(input: { readonly partStudioAdapter?: PartStudioRenderAdapter } = {}) {
        this.partStudioAdapter = input.partStudioAdapter ?? new PartStudioRenderAdapter();
    }

    public createDocument(input: CreateCadRenderDocumentInput): CadRenderDocument {
        return {
            partStudio: this.createPartStudio({
                activeSketchFeatureId: input.activeSketchFeatureId ?? null,
                draft: input.draft ?? null,
                partStudio: input.document.getActivePartStudio(),
            }),
        };
    }

    public createPartStudio(input: CreateCadRenderPartStudioInput): CadRenderPartStudio {
        return this.partStudioAdapter.createPartStudio(input);
    }
}
