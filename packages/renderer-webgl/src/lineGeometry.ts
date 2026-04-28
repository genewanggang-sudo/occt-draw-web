import type {
    DisplayModel,
    PointBatchDisplayObject,
    SurfaceBatchDisplayObject,
} from '@occt-draw/display';
import type { RenderHighlightState } from '@occt-draw/renderer';
import { appendAxis } from './axisGeometry';
import { appendCubeWireframe } from './cubeWireframeGeometry';
import { appendDisplayLineSegments } from './displayLineGeometry';
import { appendGrid } from './gridGeometry';
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

export function createDisplayLineVertices(
    displayModel: DisplayModel,
    highlight: RenderHighlightState,
): readonly LineVertex[] {
    const vertices: LineVertex[] = [];
    const selectedObjectIdSet = new Set(highlight.selectedObjectIds);
    const preselectedObjectId = highlight.preselectedObjectId;
    const preselectedPrimitiveId = highlight.preselectedPrimitiveId;
    const selectedPrimitiveId = highlight.selectedPrimitiveId;

    for (const object of displayModel.objects) {
        if (!object.visible) {
            continue;
        }

        if (object.kind === 'grid') {
            appendGrid(vertices, object.size, object.divisions);
            continue;
        }

        if (object.kind === 'axis') {
            appendAxis(vertices, object.length);
            continue;
        }

        if (object.kind === 'line-batch' || object.kind === 'line-segments') {
            appendDisplayLineSegments(vertices, object);
            continue;
        }

        if (object.kind === 'point-batch' || object.kind === 'surface-batch') {
            continue;
        }

        appendCubeWireframe(
            vertices,
            object,
            selectedObjectIdSet.has(object.id),
            preselectedObjectId === object.id,
            selectedPrimitiveId,
            preselectedPrimitiveId,
        );
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
