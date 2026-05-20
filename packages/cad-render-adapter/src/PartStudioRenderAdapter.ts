import type { CadDocument, PartStudio } from '@occt-draw/cad-model';
import type { EditDraft } from '@occt-draw/core';
import type { CadRenderPartStudio } from '@occt-draw/cad-rendering';
import { ActiveSketchPlaneRenderAdapter } from './ActiveSketchPlaneRenderAdapter';
import { CadObjectRenderAdapter } from './CadObjectRenderAdapter';
import { DraftRenderAdapter } from './DraftRenderAdapter';
import { SketchRenderAdapter } from './SketchRenderAdapter';

export interface CreatePartStudioRenderInput {
    readonly activeSketchFeatureId?: string | null;
    readonly draft?: EditDraft<CadDocument> | null;
    readonly partStudio: PartStudio;
}

export class PartStudioRenderAdapter {
    private readonly activeSketchPlaneAdapter: ActiveSketchPlaneRenderAdapter;
    private readonly draftAdapter: DraftRenderAdapter;
    private readonly objectAdapter: CadObjectRenderAdapter;
    private readonly sketchAdapter: SketchRenderAdapter;

    constructor(
        input: {
            readonly activeSketchPlaneAdapter?: ActiveSketchPlaneRenderAdapter;
            readonly draftAdapter?: DraftRenderAdapter;
            readonly objectAdapter?: CadObjectRenderAdapter;
            readonly sketchAdapter?: SketchRenderAdapter;
        } = {},
    ) {
        this.activeSketchPlaneAdapter =
            input.activeSketchPlaneAdapter ?? new ActiveSketchPlaneRenderAdapter();
        this.draftAdapter = input.draftAdapter ?? new DraftRenderAdapter();
        this.objectAdapter = input.objectAdapter ?? new CadObjectRenderAdapter();
        this.sketchAdapter = input.sketchAdapter ?? new SketchRenderAdapter();
    }

    public createPartStudio(input: CreatePartStudioRenderInput): CadRenderPartStudio {
        return {
            activeSketchPlane: this.activeSketchPlaneAdapter.createActiveSketchPlane({
                activeSketchFeatureId: input.activeSketchFeatureId ?? null,
                partStudio: input.partStudio,
            }),
            draft: this.draftAdapter.createDraft(input.draft ?? null),
            objects: input.partStudio.objects.map((object) =>
                this.objectAdapter.createObject(object),
            ),
            sketches: this.sketchAdapter.createSketches(input.partStudio),
        };
    }
}
