import type {
    DisplayModel,
    MarkerBatchDisplayObject,
    PointBatchDisplayObject,
    SurfaceBatchDisplayObject,
} from '@occt-draw/display';
import { appendDisplayLineSegments } from './displayLineGeometry';
import type { LineVertex, MarkerVertex, RenderVertex } from './types';
export { toVertexBuffer } from './vertexBuffer';

export function createDisplaySurfaceVertices(displayModel: DisplayModel): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const object of displayModel.objects) {
        if (!object.visible || object.kind !== 'surface-batch') {
            continue;
        }

        appendSurfaceBatch(vertices, object);
    }

    return vertices;
}

export function createDisplayLineVertices(displayModel: DisplayModel): readonly LineVertex[] {
    const vertices: LineVertex[] = [];

    for (const object of displayModel.objects) {
        if (object.visible && object.kind === 'line-batch') {
            appendDisplayLineSegments(vertices, object);
        }
    }

    return vertices;
}

export function createDisplayPointVertices(displayModel: DisplayModel): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const object of displayModel.objects) {
        if (!object.visible || object.kind !== 'point-batch') {
            continue;
        }

        appendPointBatch(vertices, object);
    }

    return vertices;
}

export function createDisplayMarkerVertices(displayModel: DisplayModel): readonly MarkerVertex[] {
    const vertices: MarkerVertex[] = [];

    for (const object of displayModel.objects) {
        if (!object.visible || object.kind !== 'marker-batch') {
            continue;
        }

        appendMarkerBatch(vertices, object);
    }

    return vertices;
}

function appendMarkerBatch(vertices: MarkerVertex[], object: MarkerBatchDisplayObject): void {
    for (const marker of object.markers) {
        vertices.push({
            position: marker.position,
            color: marker.color,
            alpha: 1,
            sizePixels: marker.sizePixels,
        });
    }
}

function appendPointBatch(vertices: RenderVertex[], object: PointBatchDisplayObject): void {
    for (const point of object.points) {
        vertices.push({
            position: point,
            color: object.color,
            alpha: 1,
        });
    }
}

function appendSurfaceBatch(vertices: RenderVertex[], object: SurfaceBatchDisplayObject): void {
    for (const triangle of object.triangles) {
        vertices.push(
            { position: triangle.a, color: object.color, alpha: object.opacity },
            { position: triangle.b, color: object.color, alpha: object.opacity },
            { position: triangle.c, color: object.color, alpha: object.opacity },
        );
    }
}
