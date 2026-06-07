import { LineSegment3, Vec3, type Vector3 } from '@occt-draw/math';
import { GeometryBufferBuilder } from '../geometry';
import type { RenderGraphObjectEntry } from '../graphTraversal';
import { collectPickableGraphObjects } from '../graphTraversal';
import { createRenderPrimitiveId } from '../primitiveId';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from '../scene';
import type { MarkerVertex, RenderHighlightState } from '../types';
import type { RenderPass, RenderPassContext } from './renderPass';
import { resolveHighlightLineMaterial } from './renderMaterial';

type HighlightKind = 'hovered' | 'preselected' | 'selected';
type HighlightLineDepthMode = 'overlay' | 'scene';

interface HighlightTarget {
    readonly alpha: number;
    readonly color: Vector3;
    readonly kind: HighlightKind;
    readonly primitiveId: string | null;
}

interface HighlightLineBatch {
    readonly depthMode: HighlightLineDepthMode;
    readonly key: string;
    readonly segments: LineSegment3[];
    readonly target: HighlightTarget;
}

const HOVER_PRESELECT_COLOR = Vec3.of(0.35, 0.72, 1);
const SELECTED_COLOR = Vec3.of(1, 0.72, 0.18);
const HIGHLIGHT_LINE_ALPHA = 0.82;
const SCENE_HIGHLIGHT_LINE_WIDTH_PIXELS = 1;
const SKETCH_HIGHLIGHT_LINE_WIDTH_PIXELS = 3;
const SKETCH_METADATA_SOURCE_KEY = 'source';
const HOVER_PRESELECT_POINT_ALPHA = 0.42;
const SELECTED_POINT_ALPHA = 0.58;
const HOVER_PRESELECT_POINT_SIZE_GROWTH = 6;
const SELECTED_POINT_SIZE_GROWTH = 8;

const geometryBuilder = new GeometryBufferBuilder();

export class HighlightPass implements RenderPass {
    public readonly name = 'highlight';

    public execute({ input, resources }: RenderPassContext): void {
        const lineBatches = new Map<string, HighlightLineBatch>();
        const pointVertices: MarkerVertex[] = [];
        const markerVertices: MarkerVertex[] = [];

        for (const entry of collectPickableGraphObjects(input.graph)) {
            const target = resolveHighlightTarget(entry, input.highlight);

            if (!target) {
                continue;
            }

            appendHighlightVertices(lineBatches, pointVertices, markerVertices, entry, target);
        }

        if (lineBatches.size === 0 && pointVertices.length === 0 && markerVertices.length === 0) {
            return;
        }

        for (const batch of lineBatches.values()) {
            const material = resolveHighlightLineMaterial({
                alpha: HIGHLIGHT_LINE_ALPHA,
                color: batch.target.color,
                depthMode: batch.depthMode,
                widthPx:
                    batch.depthMode === 'overlay'
                        ? SKETCH_HIGHLIGHT_LINE_WIDTH_PIXELS
                        : SCENE_HIGHLIGHT_LINE_WIDTH_PIXELS,
            });

            resources.backend.drawImmediateGeometry({
                cacheKey: `highlight:${batch.key}`,
                drawMode: 'triangles',
                geometryBuffer: geometryBuilder.screenSpaceLineSegments(batch.segments, {
                    stipple: material.lineStipple,
                    widthPx: material.lineWidthPx,
                }),
                material,
                primitiveKind: 'edge',
            });
        }

        for (const vertex of pointVertices) {
            resources.backend.drawImmediatePrimitives({
                drawMode: 'points',
                pointShape: 'halo',
                pointSize: vertex.sizePixels,
                state: HIGHLIGHT_POINT_RENDER_STATE,
                vertices: [vertex],
            });
        }

        for (const vertex of markerVertices) {
            resources.backend.drawImmediatePrimitives({
                drawMode: 'points',
                pointShape: 'marker',
                pointSize: vertex.sizePixels,
                state: HIGHLIGHT_POINT_RENDER_STATE,
                vertices: [vertex],
            });
        }
    }
}

const HIGHLIGHT_POINT_RENDER_STATE = {
    blend: true,
    depthFunc: 'lequal',
    depthWrite: false,
} as const;

function resolveHighlightTarget(
    entry: RenderGraphObjectEntry,
    highlight: RenderHighlightState,
): HighlightTarget | null {
    const objectId = entry.object.interactionId;

    if (highlight.preselectedObjectId === objectId) {
        return {
            alpha: HOVER_PRESELECT_POINT_ALPHA,
            color: HOVER_PRESELECT_COLOR,
            kind: 'preselected',
            primitiveId: highlight.preselectedPrimitiveId,
        };
    }

    if (highlight.selectedObjectIds.includes(objectId)) {
        return {
            alpha: SELECTED_POINT_ALPHA,
            color: SELECTED_COLOR,
            kind: 'selected',
            primitiveId: highlight.selectedPrimitiveId,
        };
    }

    if (highlight.hoveredObjectId === objectId) {
        return {
            alpha: HOVER_PRESELECT_POINT_ALPHA,
            color: HOVER_PRESELECT_COLOR,
            kind: 'hovered',
            primitiveId: null,
        };
    }

    return null;
}

function appendHighlightVertices(
    lineBatches: Map<string, HighlightLineBatch>,
    pointVertices: MarkerVertex[],
    markerVertices: MarkerVertex[],
    entry: RenderGraphObjectEntry,
    target: HighlightTarget,
): void {
    const object = entry.object;

    if (object instanceof FaceSet) {
        appendFaceSetHighlight(lineBatches, object, target);
    } else if (object instanceof EdgeSet) {
        appendEdgeSetHighlight(lineBatches, object, target);
    } else if (object instanceof PointSet) {
        appendPointSetHighlight(pointVertices, object, target);
    } else if (object instanceof MarkerSet) {
        appendMarkerSetHighlight(markerVertices, object, target);
    }
}

function appendFaceSetHighlight(
    lineBatches: Map<string, HighlightLineBatch>,
    object: FaceSet,
    target: HighlightTarget,
): void {
    if (target.primitiveId === null) {
        appendFaceSetBoundaryHighlight(lineBatches, object, target);
        return;
    }

    for (let index = 0; index < object.geometry.triangles.length; index += 1) {
        const triangle = object.geometry.triangles[index];

        if (!triangle || !shouldDrawPrimitive(object.id, 'face', index, target)) {
            continue;
        }

        appendLineSegment(lineBatches, triangle.a, triangle.b, target, 'scene');
        appendLineSegment(lineBatches, triangle.b, triangle.c, target, 'scene');
        appendLineSegment(lineBatches, triangle.c, triangle.a, target, 'scene');
    }
}

function appendFaceSetBoundaryHighlight(
    lineBatches: Map<string, HighlightLineBatch>,
    object: FaceSet,
    target: HighlightTarget,
): void {
    const edges = new Map<
        string,
        {
            readonly start: Vector3;
            readonly end: Vector3;
            count: number;
        }
    >();

    for (const triangle of object.geometry.triangles) {
        addBoundaryEdge(edges, triangle.a, triangle.b);
        addBoundaryEdge(edges, triangle.b, triangle.c);
        addBoundaryEdge(edges, triangle.c, triangle.a);
    }

    for (const edge of edges.values()) {
        if (edge.count === 1) {
            appendLineSegment(lineBatches, edge.start, edge.end, target, 'scene');
        }
    }
}

function addBoundaryEdge(
    edges: Map<
        string,
        {
            readonly start: Vector3;
            readonly end: Vector3;
            count: number;
        }
    >,
    start: Vector3,
    end: Vector3,
): void {
    const startKey = toPointKey(start);
    const endKey = toPointKey(end);
    const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
    const existing = edges.get(key);

    if (existing) {
        existing.count += 1;
        return;
    }

    edges.set(key, { start, end, count: 1 });
}

function toPointKey(point: Vector3): string {
    return `${point.x.toPrecision(12)},${point.y.toPrecision(12)},${point.z.toPrecision(12)}`;
}

function appendEdgeSetHighlight(
    lineBatches: Map<string, HighlightLineBatch>,
    object: EdgeSet,
    target: HighlightTarget,
): void {
    const depthMode = isSketchEdgeSet(object) ? 'overlay' : 'scene';

    for (let index = 0; index < object.geometry.segments.length; index += 1) {
        const segment = object.geometry.segments[index];

        if (!segment || !shouldDrawPrimitive(object.id, 'edge', index, target)) {
            continue;
        }

        appendLineSegment(lineBatches, segment.start, segment.end, target, depthMode);
    }
}

function isSketchEdgeSet(object: EdgeSet): boolean {
    return object.geometry.metadata.some(
        (metadata) => metadata?.get(SKETCH_METADATA_SOURCE_KEY) === 'sketch',
    );
}

function appendPointSetHighlight(
    vertices: MarkerVertex[],
    object: PointSet,
    target: HighlightTarget,
): void {
    for (let index = 0; index < object.geometry.points.length; index += 1) {
        const point = object.geometry.points[index];

        if (!point || !shouldDrawPrimitive(object.id, 'vertex', index, target)) {
            continue;
        }

        vertices.push({
            alpha: target.alpha,
            color: target.color,
            position: point,
            sizePixels: object.style.sizePixels + getPointHighlightSizeGrowth(target),
        });
    }
}

function appendMarkerSetHighlight(
    vertices: MarkerVertex[],
    object: MarkerSet,
    target: HighlightTarget,
): void {
    for (let index = 0; index < object.geometry.markers.length; index += 1) {
        const marker = object.geometry.markers[index];

        if (!marker || !shouldDrawPrimitive(object.id, 'vertex', index, target)) {
            continue;
        }

        vertices.push({
            alpha: target.alpha,
            color: target.color,
            position: marker.position,
            sizePixels: marker.sizePixels + getPointHighlightSizeGrowth(target),
        });
    }
}

function getPointHighlightSizeGrowth(target: HighlightTarget): number {
    return target.kind === 'selected'
        ? SELECTED_POINT_SIZE_GROWTH
        : HOVER_PRESELECT_POINT_SIZE_GROWTH;
}

function shouldDrawPrimitive(
    objectId: string,
    primitiveKind: Parameters<typeof createRenderPrimitiveId>[1],
    primitiveIndex: number,
    target: HighlightTarget,
): boolean {
    return (
        target.primitiveId === null ||
        target.primitiveId === createRenderPrimitiveId(objectId, primitiveKind, primitiveIndex)
    );
}

function appendLineSegment(
    batches: Map<string, HighlightLineBatch>,
    start: Vector3,
    end: Vector3,
    target: HighlightTarget,
    depthMode: HighlightLineDepthMode,
): void {
    getLineBatch(batches, target, depthMode).segments.push(new LineSegment3(start, end));
}

function getLineBatch(
    batches: Map<string, HighlightLineBatch>,
    target: HighlightTarget,
    depthMode: HighlightLineDepthMode,
): HighlightLineBatch {
    const key = `${depthMode}:${target.kind}`;
    const existing = batches.get(key);

    if (existing) {
        return existing;
    }

    const batch = {
        depthMode,
        key,
        segments: [],
        target,
    };

    batches.set(key, batch);

    return batch;
}
