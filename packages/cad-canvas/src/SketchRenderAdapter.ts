import {
    getSketchForFeature,
    referencePlaneToPlane,
    type Feature,
    type PartStudio,
} from '@occt-draw/cad-model';
import type { CanvasObject } from '@occt-draw/canvas';
import { SketchDisplayBuilder, SketchEntityKind, type SketchDisplayEdge } from '@occt-draw/sketch';
import { EDIT_PREVIEW_LAYER_ID } from './canvasAdapterLayers';
import { createCanvasPrimitiveMetadata } from './canvasAdapterMetadata';
import { ReferencePlaneResolver } from './ReferencePlaneResolver';
import {
    ON_SHAPE_FREE_SKETCH_POINT_COLOR,
    ON_SHAPE_FREE_SKETCH_POINT_FONT,
    ON_SHAPE_FREE_SKETCH_POINT_SIZE_PX,
    ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR,
    ON_SHAPE_SKETCH_VERTEX_POINT_FONT,
    ON_SHAPE_SKETCH_VERTEX_POINT_SIZE_PX,
} from './sketchPointVisuals';
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

        const topologyEdges = display.edges.filter(
            (edge) => edge.ref.kind !== SketchEntityKind.Curve,
        );
        const curveEdgeGroups = groupCurveEdges(display.edges);

        if (topologyEdges.length > 0) {
            objects.push({
                color: ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR,
                depthRole: 'primary',
                id: feature.id,
                interactionId: sketch.id,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: feature.name,
                primitiveMetadata: topologyEdges.map((edge) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, edge.ref),
                    ),
                ),
                segments: topologyEdges.map((edge) => edge.segment),
                visible: !feature.suppressed,
            });
        }

        for (const curveEdges of curveEdgeGroups.values()) {
            const firstEdge = curveEdges[0];

            if (!firstEdge) {
                continue;
            }

            objects.push({
                color: ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR,
                depthRole: 'primary',
                id: `${feature.id}:curve:${firstEdge.ref.id}`,
                interactionId: `${sketch.id}:curve:${firstEdge.ref.id}`,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} curve`,
                pickGranularity: 'object',
                primitiveMetadata: curveEdges.map((edge) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, edge.ref),
                    ),
                ),
                segments: curveEdges.map((edge) => edge.segment),
                visible: !feature.suppressed,
            });
        }

        if (display.vertices.length > 0) {
            objects.push({
                color: ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR,
                depthRole: 'primary',
                id: `${feature.id}:vertices`,
                interactionId: sketch.id,
                kind: 'point',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} vertices`,
                pointFont: ON_SHAPE_SKETCH_VERTEX_POINT_FONT,
                pointRenderMode: 'billboard-font',
                points: display.vertices.map((point) => point.point),
                primitiveMetadata: display.vertices.map((point) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, point.ref),
                    ),
                ),
                sizePixels: ON_SHAPE_SKETCH_VERTEX_POINT_SIZE_PX,
                visible: !feature.suppressed,
            });
        }

        if (display.points.length > 0) {
            objects.push({
                color: ON_SHAPE_FREE_SKETCH_POINT_COLOR,
                depthRole: 'primary',
                id: `${feature.id}:points`,
                interactionId: sketch.id,
                kind: 'point',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} points`,
                pointFont: ON_SHAPE_FREE_SKETCH_POINT_FONT,
                pointRenderMode: 'billboard-font',
                points: display.points.map((point) => point.point),
                primitiveMetadata: display.points.map((point) =>
                    createCanvasPrimitiveMetadata(
                        this.pickRefAdapter.createSketchPickRef(feature.id, point.ref),
                    ),
                ),
                sizePixels: ON_SHAPE_FREE_SKETCH_POINT_SIZE_PX,
                visible: !feature.suppressed,
            });
        }

        return objects;
    }
}

function groupCurveEdges(
    edges: readonly SketchDisplayEdge[],
): ReadonlyMap<string, SketchDisplayEdge[]> {
    const groups = new Map<string, SketchDisplayEdge[]>();

    for (const edge of edges) {
        if (edge.ref.kind !== SketchEntityKind.Curve) {
            continue;
        }

        const group = groups.get(edge.ref.id);

        if (group) {
            group.push(edge);
        } else {
            groups.set(edge.ref.id, [edge]);
        }
    }

    return groups;
}
