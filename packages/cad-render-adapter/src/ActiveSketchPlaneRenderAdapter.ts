import { getSketchForFeature, type PartStudio } from '@occt-draw/cad-model';
import type { CadRenderActiveSketchPlane } from '@occt-draw/cad-rendering';
import { ReferencePlaneResolver } from './ReferencePlaneResolver';

export interface CreateActiveSketchPlaneRenderInput {
    readonly activeSketchFeatureId: string | null;
    readonly partStudio: PartStudio;
}

export class ActiveSketchPlaneRenderAdapter {
    private readonly referencePlaneResolver: ReferencePlaneResolver;

    constructor(input: { readonly referencePlaneResolver?: ReferencePlaneResolver } = {}) {
        this.referencePlaneResolver = input.referencePlaneResolver ?? new ReferencePlaneResolver();
    }

    public createActiveSketchPlane(
        input: CreateActiveSketchPlaneRenderInput,
    ): CadRenderActiveSketchPlane | null {
        if (!input.activeSketchFeatureId) {
            return null;
        }

        const feature = input.partStudio.findFeatureById(input.activeSketchFeatureId);
        const sketch = feature ? getSketchForFeature(input.partStudio, feature) : null;

        if (!feature || !sketch) {
            return null;
        }

        const referencePlane = this.referencePlaneResolver.findReferencePlaneById(
            input.partStudio,
            sketch.planeRef,
        );

        if (!referencePlane) {
            return null;
        }

        return {
            featureId: feature.id,
            name: feature.name,
            normal: referencePlane.normal,
            origin: referencePlane.origin,
            planeKind: referencePlane.planeKind,
            size: referencePlane.size,
            visible: referencePlane.visible,
            xAxis: referencePlane.xAxis,
        };
    }
}
