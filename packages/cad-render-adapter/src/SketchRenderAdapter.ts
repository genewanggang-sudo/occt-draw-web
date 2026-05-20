import {
    getSketchForFeature,
    referencePlaneToPlane,
    type Feature,
    type PartStudio,
} from '@occt-draw/cad-model';
import type {
    CadRenderSketch,
    CadRenderSketchEdge,
    CadRenderSketchVertex,
} from '@occt-draw/cad-rendering';
import { SketchDisplayBuilder } from '@occt-draw/sketch';
import { ReferencePlaneResolver } from './ReferencePlaneResolver';
import { SketchPickRefAdapter } from './SketchPickRefAdapter';

export class SketchRenderAdapter {
    private readonly pickRefAdapter: SketchPickRefAdapter;
    private readonly referencePlaneResolver: ReferencePlaneResolver;
    private readonly sketchDisplayBuilder: SketchDisplayBuilder;

    constructor(
        input: {
            readonly pickRefAdapter?: SketchPickRefAdapter;
            readonly referencePlaneResolver?: ReferencePlaneResolver;
            readonly sketchDisplayBuilder?: SketchDisplayBuilder;
        } = {},
    ) {
        this.pickRefAdapter = input.pickRefAdapter ?? new SketchPickRefAdapter();
        this.referencePlaneResolver = input.referencePlaneResolver ?? new ReferencePlaneResolver();
        this.sketchDisplayBuilder = input.sketchDisplayBuilder ?? new SketchDisplayBuilder();
    }

    public createSketches(partStudio: PartStudio): readonly CadRenderSketch[] {
        return partStudio.features.flatMap((feature) => this.createSketch(partStudio, feature));
    }

    public createSketch(partStudio: PartStudio, feature: Feature): readonly CadRenderSketch[] {
        const sketch = getSketchForFeature(partStudio, feature);

        if (!sketch) {
            return [];
        }

        const referencePlane = this.referencePlaneResolver.findReferencePlaneById(
            partStudio,
            sketch.planeRef,
        );

        if (!referencePlane) {
            return [];
        }

        const display = this.sketchDisplayBuilder.build(
            sketch,
            referencePlaneToPlane(referencePlane),
        );

        return [
            {
                edges: display.edges.map((edge): CadRenderSketchEdge => {
                    return {
                        id: this.pickRefAdapter.getSketchEntityId(edge.ref),
                        pickRef: this.pickRefAdapter.createSketchPickRef(feature.id, edge.ref),
                        role: edge.role,
                        segment: edge.segment,
                    };
                }),
                featureId: feature.id,
                id: sketch.id,
                name: feature.name,
                vertices: display.vertices.map((vertex): CadRenderSketchVertex => {
                    return {
                        id: this.pickRefAdapter.getSketchEntityId(vertex.ref),
                        pickRef: this.pickRefAdapter.createSketchPickRef(feature.id, vertex.ref),
                        point: vertex.point,
                    };
                }),
                visible: !feature.suppressed,
            },
        ];
    }
}
