import type {
    RenderScene,
    MarkerBatchRenderNode,
    PointBatchRenderNode,
    SurfaceBatchRenderNode,
} from './types';
import { appendDisplayLineSegments } from './displayLineGeometry';
import type { LineVertex, MarkerVertex, RenderVertex } from './types';
export { toVertexBuffer } from './vertexBuffer';

export function createRenderSurfaceVertices(scene: RenderScene): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const object of scene.nodes) {
        if (!object.visible || object.kind !== 'surface-batch') {
            continue;
        }

        appendSurfaceBatch(vertices, object);
    }

    return vertices;
}

export function createRenderLineVertices(scene: RenderScene): readonly LineVertex[] {
    const vertices: LineVertex[] = [];

    for (const object of scene.nodes) {
        if (object.visible && object.kind === 'line-batch') {
            appendDisplayLineSegments(vertices, object);
        }
    }

    return vertices;
}

export function createRenderPointVertices(scene: RenderScene): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const object of scene.nodes) {
        if (!object.visible || object.kind !== 'point-batch') {
            continue;
        }

        appendPointBatch(vertices, object);
    }

    return vertices;
}

export function createRenderMarkerVertices(scene: RenderScene): readonly MarkerVertex[] {
    const vertices: MarkerVertex[] = [];

    for (const object of scene.nodes) {
        if (!object.visible || object.kind !== 'marker-batch') {
            continue;
        }

        appendMarkerBatch(vertices, object);
    }

    return vertices;
}

function appendMarkerBatch(vertices: MarkerVertex[], object: MarkerBatchRenderNode): void {
    for (const marker of object.markers) {
        vertices.push({
            position: marker.position,
            color: marker.color,
            alpha: 1,
            sizePixels: marker.sizePixels,
        });
    }
}

function appendPointBatch(vertices: RenderVertex[], object: PointBatchRenderNode): void {
    for (const point of object.points) {
        vertices.push({
            position: point,
            color: object.color,
            alpha: 1,
        });
    }
}

function appendSurfaceBatch(vertices: RenderVertex[], object: SurfaceBatchRenderNode): void {
    for (const triangle of object.triangles) {
        vertices.push(
            { position: triangle.a, color: object.color, alpha: object.opacity },
            { position: triangle.b, color: object.color, alpha: object.opacity },
            { position: triangle.c, color: object.color, alpha: object.opacity },
        );
    }
}
