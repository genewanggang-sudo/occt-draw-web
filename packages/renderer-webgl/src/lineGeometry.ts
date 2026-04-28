import type {
    DisplayModel,
    PointBatchDisplayObject,
    SurfaceBatchDisplayObject,
} from '@occt-draw/display';
import { appendDisplayLineSegments } from './displayLineGeometry';
import type { LineVertex, RenderVertex } from './types';
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
