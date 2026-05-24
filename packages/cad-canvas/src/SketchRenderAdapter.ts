import {
    getSketchForFeature,
    referencePlaneToPlane,
    type Feature,
    type PartStudio,
} from '@occt-draw/cad-model';
import type { CanvasObject } from '@occt-draw/canvas';
import { Vec3 } from '@occt-draw/math';
import { SketchDisplayBuilder } from '@occt-draw/sketch';
import { EDIT_PREVIEW_LAYER_ID } from './canvasAdapterLayers';
import { createCanvasPrimitiveMetadata } from './canvasAdapterMetadata';
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

    public createSketches(partStudio: PartStudio): readonly CanvasObject[] {
        return partStudio.features.flatMap((feature) => this.createSketch(partStudio, feature));
    }

    public createSketch(partStudio: PartStudio, feature: Feature): readonly CanvasObject[] {
        const sketch = getSketchForFeature(partStudio, feature);

        if (!sketch) {
            return [];
        }

        const referencePlane = this.referencePlaneResolver.findReferencePlaneById(
            partStudio,
            sketch.plane.planeObjectRef.id,
        );

        if (!referencePlane) {
            return [];
        }

        const display = this.sketchDisplayBuilder.build(
            sketch,
            referencePlaneToPlane(referencePlane),
        );
        const objects: CanvasObject[] = [];

        if (display.edges.length > 0) {
            objects.push({
                color: Vec3.of(0.05, 0.38, 0.85),
                depthRole: 'primary',
                id: feature.id,
                interactionId: sketch.id,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: feature.name,
                primitiveMetadata: display.edges.map((edge) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, edge.ref),
                    ),
                ),
                segments: display.edges.map((edge) => edge.segment),
                visible: !feature.suppressed,
            });
        }

        if (display.vertices.length > 0) {
            objects.push({
                color: Vec3.of(0.05, 0.38, 0.85),
                depthRole: 'primary',
                id: `${feature.id}:points`,
                interactionId: sketch.id,
                kind: 'point',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} points`,
                points: display.vertices.map((vertex) => vertex.point),
                primitiveMetadata: display.vertices.map((vertex) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, vertex.ref),
                    ),
                ),
                sizePixels: 7,
                visible: !feature.suppressed,
            });
        }

        return objects;
    }
}
