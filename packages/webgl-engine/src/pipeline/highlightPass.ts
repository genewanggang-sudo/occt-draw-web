import { Vec3, type Vector3 } from '@occt-draw/math';
import type { RenderGraphObjectEntry } from '../graphTraversal';
import { collectPickableGraphObjects } from '../graphTraversal';
import { createViewProjectionMatrix } from '../matrix';
import { createRenderPrimitiveId } from '../primitiveId';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from '../scene';
import type {
    MarkerVertex,
    Matrix4,
    RenderHighlightState,
    RenderVertex,
    ViewportSize,
} from '../types';
import type { RenderPass, RenderPassContext } from './renderPass';

type HighlightKind = 'hovered' | 'preselected' | 'selected';

interface HighlightTarget {
    readonly alpha: number;
    readonly color: Vector3;
    readonly kind: HighlightKind;
    readonly primitiveId: string | null;
}

const HOVER_PRESELECT_COLOR = Vec3.of(0.35, 0.72, 1);
const SELECTED_COLOR = Vec3.of(1, 0.72, 0.18);
const HIGHLIGHT_LINE_ALPHA = 0.82;
const SKETCH_HIGHLIGHT_LINE_WIDTH_PIXELS = 3;
const SKETCH_METADATA_SOURCE_KEY = 'source';
const HOVER_PRESELECT_POINT_ALPHA = 0.42;
const SELECTED_POINT_ALPHA = 0.58;
const HOVER_PRESELECT_POINT_SIZE_GROWTH = 6;
const SELECTED_POINT_SIZE_GROWTH = 8;
const IDENTITY_MATRIX_4: Matrix4 = new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

export class HighlightPass implements RenderPass {
    public readonly name = 'highlight';

    public execute({ input, resources }: RenderPassContext): void {
        const lineVertices: RenderVertex[] = [];
        const thickLineVertices: RenderVertex[] = [];
        const pointVertices: MarkerVertex[] = [];
        const markerVertices: MarkerVertex[] = [];
        const viewProjectionMatrix = createViewProjectionMatrix(input.camera, input.viewportSize);

        for (const entry of collectPickableGraphObjects(input.graph)) {
            const target = resolveHighlightTarget(entry, input.highlight);

            if (!target) {
                continue;
            }

            appendHighlightVertices(
                lineVertices,
                thickLineVertices,
                pointVertices,
                markerVertices,
                entry,
                target,
                viewProjectionMatrix,
                input.viewportSize,
            );
        }

        if (
            lineVertices.length === 0 &&
            thickLineVertices.length === 0 &&
            pointVertices.length === 0 &&
            markerVertices.length === 0
        ) {
            return;
        }

        resources.backend.drawImmediatePrimitives({
            drawMode: 'lines',
            state: HIGHLIGHT_RENDER_STATE,
            vertices: lineVertices,
        });

        resources.backend.drawImmediatePrimitives({
            drawMode: 'triangles',
            matrix: IDENTITY_MATRIX_4,
            state: SKETCH_HIGHLIGHT_RENDER_STATE,
            vertices: thickLineVertices,
        });

        for (const vertex of pointVertices) {
            resources.backend.drawImmediatePrimitives({
                drawMode: 'points',
                pointShape: 'halo',
                pointSize: vertex.sizePixels,
                state: HIGHLIGHT_RENDER_STATE,
                vertices: [vertex],
            });
        }

        for (const vertex of markerVertices) {
            resources.backend.drawImmediatePrimitives({
                drawMode: 'points',
                pointShape: 'marker',
                pointSize: vertex.sizePixels,
                state: HIGHLIGHT_RENDER_STATE,
                vertices: [vertex],
            });
        }
    }
}

const HIGHLIGHT_RENDER_STATE = {
    blend: true,
    depthFunc: 'lequal',
    depthWrite: false,
} as const;

const SKETCH_HIGHLIGHT_RENDER_STATE = {
    blend: true,
    depthTest: false,
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
    lineVertices: RenderVertex[],
    thickLineVertices: RenderVertex[],
    pointVertices: MarkerVertex[],
    markerVertices: MarkerVertex[],
    entry: RenderGraphObjectEntry,
    target: HighlightTarget,
    viewProjectionMatrix: Matrix4,
    viewportSize: ViewportSize,
): void {
    const object = entry.object;

    if (object instanceof FaceSet) {
        appendFaceSetHighlight(lineVertices, object, target);
    } else if (object instanceof EdgeSet) {
        appendEdgeSetHighlight(
            lineVertices,
            thickLineVertices,
            object,
            target,
            viewProjectionMatrix,
            viewportSize,
        );
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
        appendFaceSetBoundaryHighlight(vertices, object, target);
        return;
    }

    for (let index = 0; index < object.geometry.triangles.length; index += 1) {
        const triangle = object.geometry.triangles[index];

        if (!triangle || !shouldDrawPrimitive(object.id, 'face', index, target)) {
            continue;
        }

        appendLine(vertices, triangle.a, triangle.b, target);
        appendLine(vertices, triangle.b, triangle.c, target);
        appendLine(vertices, triangle.c, triangle.a, target);
    }
}

function appendFaceSetBoundaryHighlight(
    vertices: RenderVertex[],
    object: FaceSet,
    target: HighlightTarget,
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
            appendLine(vertices, edge.start, edge.end, target);
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
    lineVertices: RenderVertex[],
    thickLineVertices: RenderVertex[],
    object: EdgeSet,
    target: HighlightTarget,
    viewProjectionMatrix: Matrix4,
    viewportSize: ViewportSize,
): void {
    const useSketchLineOverlay = isSketchEdgeSet(object);

    for (let index = 0; index < object.geometry.segments.length; index += 1) {
        const segment = object.geometry.segments[index];

        if (!segment || !shouldDrawPrimitive(object.id, 'edge', index, target)) {
            continue;
        }

        if (useSketchLineOverlay) {
            appendScreenSpaceLineQuad(
                thickLineVertices,
                segment.start,
                segment.end,
                target,
                viewProjectionMatrix,
                viewportSize,
            );
        } else {
            appendLine(lineVertices, segment.start, segment.end, target);
        }
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

function appendLine(
    vertices: RenderVertex[],
    start: RenderVertex['position'],
    end: RenderVertex['position'],
    target: HighlightTarget,
): void {
    vertices.push(
        { alpha: HIGHLIGHT_LINE_ALPHA, color: target.color, position: start },
        { alpha: HIGHLIGHT_LINE_ALPHA, color: target.color, position: end },
    );
}

function appendScreenSpaceLineQuad(
    vertices: RenderVertex[],
    start: RenderVertex['position'],
    end: RenderVertex['position'],
    target: HighlightTarget,
    matrix: Matrix4,
    viewportSize: ViewportSize,
): void {
    const startClip = projectToClip(start, matrix);
    const endClip = projectToClip(end, matrix);

    if (!startClip || !endClip) {
        return;
    }

    const startScreen = clipToScreen(startClip, viewportSize);
    const endScreen = clipToScreen(endClip, viewportSize);
    const dx = endScreen.x - startScreen.x;
    const dy = endScreen.y - startScreen.y;
    const length = Math.hypot(dx, dy);

    if (!Number.isFinite(length) || length <= 0.0001) {
        return;
    }

    const halfWidth = SKETCH_HIGHLIGHT_LINE_WIDTH_PIXELS / 2;
    const normalX = (-dy / length) * halfWidth;
    const normalY = (dx / length) * halfWidth;
    const startLeft = screenToNdc(
        { x: startScreen.x + normalX, y: startScreen.y + normalY },
        startClip.z,
        viewportSize,
    );
    const startRight = screenToNdc(
        { x: startScreen.x - normalX, y: startScreen.y - normalY },
        startClip.z,
        viewportSize,
    );
    const endLeft = screenToNdc(
        { x: endScreen.x + normalX, y: endScreen.y + normalY },
        endClip.z,
        viewportSize,
    );
    const endRight = screenToNdc(
        { x: endScreen.x - normalX, y: endScreen.y - normalY },
        endClip.z,
        viewportSize,
    );

    appendTriangle(vertices, startLeft, startRight, endRight, target);
    appendTriangle(vertices, startLeft, endRight, endLeft, target);
}

function appendTriangle(
    vertices: RenderVertex[],
    a: RenderVertex['position'],
    b: RenderVertex['position'],
    c: RenderVertex['position'],
    target: HighlightTarget,
): void {
    vertices.push(
        { alpha: HIGHLIGHT_LINE_ALPHA, color: target.color, position: a },
        { alpha: HIGHLIGHT_LINE_ALPHA, color: target.color, position: b },
        { alpha: HIGHLIGHT_LINE_ALPHA, color: target.color, position: c },
    );
}

function projectToClip(
    point: RenderVertex['position'],
    matrix: Matrix4,
): { readonly w: number; readonly x: number; readonly y: number; readonly z: number } | null {
    const x =
        matrixValue(matrix, 0) * point.x +
        matrixValue(matrix, 4) * point.y +
        matrixValue(matrix, 8) * point.z +
        matrixValue(matrix, 12);
    const y =
        matrixValue(matrix, 1) * point.x +
        matrixValue(matrix, 5) * point.y +
        matrixValue(matrix, 9) * point.z +
        matrixValue(matrix, 13);
    const z =
        matrixValue(matrix, 2) * point.x +
        matrixValue(matrix, 6) * point.y +
        matrixValue(matrix, 10) * point.z +
        matrixValue(matrix, 14);
    const w =
        matrixValue(matrix, 3) * point.x +
        matrixValue(matrix, 7) * point.y +
        matrixValue(matrix, 11) * point.z +
        matrixValue(matrix, 15);

    if (!Number.isFinite(w) || Math.abs(w) <= 0.000001) {
        return null;
    }

    return {
        w,
        x: x / w,
        y: y / w,
        z: z / w,
    };
}

function clipToScreen(
    point: { readonly x: number; readonly y: number },
    viewportSize: ViewportSize,
): { readonly x: number; readonly y: number } {
    return {
        x: (point.x * 0.5 + 0.5) * viewportSize.width,
        y: (0.5 - point.y * 0.5) * viewportSize.height,
    };
}

function screenToNdc(
    point: { readonly x: number; readonly y: number },
    z: number,
    viewportSize: ViewportSize,
): RenderVertex['position'] {
    return Vec3.of(
        (point.x / Math.max(viewportSize.width, 1)) * 2 - 1,
        1 - (point.y / Math.max(viewportSize.height, 1)) * 2,
        z,
    );
}

function matrixValue(matrix: Matrix4, index: number): number {
    return matrix[index] ?? 0;
}
