import type { DisplayModel } from '@occt-draw/display';
import type { RenderHighlightState } from '@occt-draw/renderer';
import { appendAxis } from './axisGeometry';
import { appendCubeWireframe } from './cubeWireframeGeometry';
import { appendDisplayLineSegments } from './displayLineGeometry';
import { appendGrid } from './gridGeometry';
import type { LineVertex } from './types';
export { toVertexBuffer } from './vertexBuffer';

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

        if (object.kind === 'line-segments') {
            appendDisplayLineSegments(vertices, object);
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
