import type { RenderGraph } from './core';
import { collectSceneGraphObjects } from './graphTraversal';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from './scene';
import type { LineVertex, MarkerVertex, RenderVertex } from './types';
export { toVertexBuffer } from './vertexBuffer';

export function createRenderSurfaceVertices(graph: RenderGraph): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (object instanceof FaceSet) {
            appendFaceSet(vertices, object);
        }
    }

    return vertices;
}

export function createRenderLineVertices(graph: RenderGraph): readonly LineVertex[] {
    const vertices: LineVertex[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (object instanceof EdgeSet) {
            appendEdgeSet(vertices, object);
        }
    }

    return vertices;
}

export function createRenderPointVertices(graph: RenderGraph): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (object instanceof PointSet) {
            appendPointSet(vertices, object);
        }
    }

    return vertices;
}

export function createRenderMarkerVertices(graph: RenderGraph): readonly MarkerVertex[] {
    const vertices: MarkerVertex[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (object instanceof MarkerSet) {
            appendMarkerSet(vertices, object);
        }
    }

    return vertices;
}

function appendMarkerSet(vertices: MarkerVertex[], object: MarkerSet): void {
    for (const marker of object.geometry.markers) {
        vertices.push({
            position: marker.position,
            color: marker.color,
            alpha: 1,
            sizePixels: marker.sizePixels,
        });
    }
}

function appendPointSet(vertices: RenderVertex[], object: PointSet): void {
    for (const point of object.geometry.points) {
        vertices.push({
            position: point,
            color: object.style.color,
            alpha: 1,
        });
    }
}

function appendFaceSet(vertices: RenderVertex[], object: FaceSet): void {
    for (const triangle of object.geometry.triangles) {
        vertices.push(
            { position: triangle.a, color: object.style.color, alpha: object.style.opacity },
            { position: triangle.b, color: object.style.color, alpha: object.style.opacity },
            { position: triangle.c, color: object.style.color, alpha: object.style.opacity },
        );
    }
}

function appendEdgeSet(vertices: LineVertex[], object: EdgeSet): void {
    for (const segment of object.geometry.segments) {
        vertices.push(
            { position: segment.start, color: object.style.color, alpha: 1 },
            { position: segment.end, color: object.style.color, alpha: 1 },
        );
    }
}
