import {
    getSketchForFeature,
    type CadDocument,
    type CadObject,
    type PartStudio,
} from '@occt-draw/cad-model';
import type { CanvasObject, CanvasScene } from '@occt-draw/canvas';
import type { EditDraft } from '@occt-draw/core';
import { ActiveSketchPlaneRenderAdapter } from './ActiveSketchPlaneRenderAdapter';
import { CadObjectRenderAdapter } from './CadObjectRenderAdapter';
import { DEFAULT_CANVAS_LAYERS } from './canvasAdapterLayers';
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

    public createPartStudio(input: CreatePartStudioRenderInput): CanvasScene {
        const activeSketchPlaneObjectId = resolveActiveSketchPlaneObjectId(
            input.partStudio,
            input.activeSketchFeatureId ?? null,
        );

        return {
            layers: DEFAULT_CANVAS_LAYERS,
            objects: [
                ...input.partStudio.objects.flatMap((object) =>
                    this.createCadObjects(object, activeSketchPlaneObjectId),
                ),
                ...this.activeSketchPlaneAdapter.createActiveSketchPlaneObjects({
                    activeSketchFeatureId: input.activeSketchFeatureId ?? null,
                    partStudio: input.partStudio,
                }),
                ...this.sketchAdapter.createSketches(input.partStudio),
                ...this.draftAdapter.createDraftObjects(input.draft ?? null),
            ],
        };
    }

    private createCadObjects(
        object: CadObject,
        activeSketchPlaneObjectId: string | null,
    ): readonly CanvasObject[] {
        const objects = this.objectAdapter.createObjects(object);

        if (object.id !== activeSketchPlaneObjectId) {
            return objects;
        }

        return objects.map((canvasObject) => ({
            ...canvasObject,
            pickable: false,
        }));
    }
}

function resolveActiveSketchPlaneObjectId(
    partStudio: PartStudio,
    activeSketchFeatureId: string | null,
): string | null {
    if (!activeSketchFeatureId) {
        return null;
    }

    const feature = partStudio.findFeatureById(activeSketchFeatureId);
    const sketch = feature ? getSketchForFeature(partStudio, feature) : null;

    return sketch?.plane.planeObjectRef.id ?? null;
}
