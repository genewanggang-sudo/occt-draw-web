import { Vec3, type Vector3 } from '@occt-draw/math';
import type { RenderGraphObjectEntry } from '../graphTraversal';
import { collectPickableGraphObjects } from '../graphTraversal';
import { createRenderPrimitiveId } from '../primitiveId';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from '../scene';
import type { MarkerVertex, RenderHighlightState, RenderVertex } from '../types';
import { toVertexBuffer } from '../vertexBuffer';
import type { RenderPass, RenderPassContext } from './renderPass';

type HighlightKind = 'hovered' | 'preselected' | 'selected';

interface HighlightTarget {
    readonly color: Vector3;
    readonly kind: HighlightKind;
    readonly primitiveId: string | null;
}

const HOVER_PRESELECT_COLOR = Vec3.of(0.35, 0.72, 1);
const SELECTED_COLOR = Vec3.of(1, 0.72, 0.18);
const HIGHLIGHT_POINT_SIZE_GROWTH = 4;

export class HighlightPass implements RenderPass {
    public readonly name = 'highlight';

    public execute({ context, input, resources }: RenderPassContext): void {
        const lineVertices: RenderVertex[] = [];
        const pointVertices: MarkerVertex[] = [];
        const markerVertices: MarkerVertex[] = [];

        for (const entry of collectPickableGraphObjects(input.graph)) {
            const target = resolveHighlightTarget(entry, input.highlight);

            if (!target) {
                continue;
            }

            appendHighlightVertices(lineVertices, pointVertices, markerVertices, entry, target);
        }

        if (
            lineVertices.length === 0 &&
            pointVertices.length === 0 &&
            markerVertices.length === 0
        ) {
            return;
        }

        context.useProgram(resources.program);
        context.bindVertexArray(resources.vertexArray);
        context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.depthMask(false);
        context.depthFunc(context.LEQUAL);

        drawVertices(context, resources, lineVertices, context.LINES, 1, 0);
        drawPointVertices(context, resources, pointVertices);
        drawMarkerVertices(context, resources, markerVertices);

        context.depthMask(true);
        context.depthFunc(context.LESS);
        context.disable(context.BLEND);
        context.bindVertexArray(null);
    }
}

function resolveHighlightTarget(
    entry: RenderGraphObjectEntry,
    highlight: RenderHighlightState,
): HighlightTarget | null {
    const objectId = entry.object.interactionId;

    if (highlight.preselectedObjectId === objectId) {
        return {
            color: HOVER_PRESELECT_COLOR,
            kind: 'preselected',
            primitiveId: highlight.preselectedPrimitiveId,
        };
    }

    if (highlight.selectedObjectIds.includes(objectId)) {
        return {
            color: SELECTED_COLOR,
            kind: 'selected',
            primitiveId: highlight.selectedPrimitiveId,
        };
    }

    if (highlight.hoveredObjectId === objectId) {
        return {
            color: HOVER_PRESELECT_COLOR,
            kind: 'hovered',
            primitiveId: null,
        };
    }

    return null;
}

function appendHighlightVertices(
    lineVertices: RenderVertex[],
    pointVertices: MarkerVertex[],
    markerVertices: MarkerVertex[],
    entry: RenderGraphObjectEntry,
    target: HighlightTarget,
): void {
    const object = entry.object;

    if (object instanceof FaceSet) {
        appendFaceSetHighlight(lineVertices, object, target);
    } else if (object instanceof EdgeSet) {
        appendEdgeSetHighlight(lineVertices, object, target);
    } else if (object instanceof PointSet) {
        appendPointSetHighlight(pointVertices, object, target);
    } else if (object instanceof MarkerSet) {
        appendMarkerSetHighlight(markerVertices, object, target);
    }
}

function appendFaceSetHighlight(
    vertices: RenderVertex[],
    object: FaceSet,
    target: HighlightTarget,
): void {
    if (target.primitiveId === null) {
        appendFaceSetBoundaryHighlight(vertices, object, target.color);
        return;
    }

    for (let index = 0; index < object.geometry.triangles.length; index += 1) {
        const triangle = object.geometry.triangles[index];

        if (!triangle || !shouldDrawPrimitive(object.id, 'face', index, target)) {
            continue;
        }

        appendLine(vertices, triangle.a, triangle.b, target.color);
        appendLine(vertices, triangle.b, triangle.c, target.color);
        appendLine(vertices, triangle.c, triangle.a, target.color);
    }
}

function appendFaceSetBoundaryHighlight(
    vertices: RenderVertex[],
    object: FaceSet,
    color: Vector3,
): void {
    const edges = new Map<
        string,
        {
            readonly start: RenderVertex['position'];
            readonly end: RenderVertex['position'];
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
            appendLine(vertices, edge.start, edge.end, color);
        }
    }
}

function addBoundaryEdge(
    edges: Map<
        string,
        {
            readonly start: RenderVertex['position'];
            readonly end: RenderVertex['position'];
            count: number;
        }
    >,
    start: RenderVertex['position'],
    end: RenderVertex['position'],
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

function toPointKey(point: RenderVertex['position']): string {
    return `${point.x.toPrecision(12)},${point.y.toPrecision(12)},${point.z.toPrecision(12)}`;
}

function appendEdgeSetHighlight(
    vertices: RenderVertex[],
    object: EdgeSet,
    target: HighlightTarget,
): void {
    for (let index = 0; index < object.geometry.segments.length; index += 1) {
        const segment = object.geometry.segments[index];

        if (!segment || !shouldDrawPrimitive(object.id, 'edge', index, target)) {
            continue;
        }

        appendLine(vertices, segment.start, segment.end, target.color);
    }
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
            alpha: 1,
            color: target.color,
            position: point,
            sizePixels: object.style.sizePixels + HIGHLIGHT_POINT_SIZE_GROWTH,
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
            alpha: 1,
            color: target.color,
            position: marker.position,
            sizePixels: marker.sizePixels + HIGHLIGHT_POINT_SIZE_GROWTH,
        });
    }
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

function appendLine(
    vertices: RenderVertex[],
    start: RenderVertex['position'],
    end: RenderVertex['position'],
    color: Vector3,
): void {
    vertices.push({ alpha: 1, color, position: start }, { alpha: 1, color, position: end });
}

function drawVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly RenderVertex[],
    mode: number,
    pointSize: number,
    pointShape: number,
): void {
    if (vertices.length === 0) {
        return;
    }

    context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);
    context.uniform1f(resources.pointSizeLocation, pointSize);
    context.uniform1f(resources.pointShapeLocation, pointShape);
    context.drawArrays(mode, 0, vertices.length);
}

function drawMarkerVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly MarkerVertex[],
): void {
    for (const vertex of vertices) {
        context.bufferData(context.ARRAY_BUFFER, toVertexBuffer([vertex]), context.STATIC_DRAW);
        context.uniform1f(resources.pointSizeLocation, vertex.sizePixels);
        context.uniform1f(resources.pointShapeLocation, 2);
        context.drawArrays(context.POINTS, 0, 1);
    }
}

function drawPointVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly MarkerVertex[],
): void {
    for (const vertex of vertices) {
        context.bufferData(context.ARRAY_BUFFER, toVertexBuffer([vertex]), context.STATIC_DRAW);
        context.uniform1f(resources.pointSizeLocation, vertex.sizePixels);
        context.uniform1f(resources.pointShapeLocation, 1);
        context.drawArrays(context.POINTS, 0, 1);
    }
}
