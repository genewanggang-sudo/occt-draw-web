import type { Vector3 } from '@occt-draw/math';
import { createRenderPrimitiveId, type RenderHighlightState } from '@occt-draw/renderer';
import type { CubeWireframeSceneObject, SceneDocument } from '@occt-draw/scene';
import type { LineVertex } from './types';

export function createSceneLineVertices(
    scene: SceneDocument,
    highlight: RenderHighlightState,
): readonly LineVertex[] {
    const vertices: LineVertex[] = [];
    const selectedObjectIdSet = new Set(highlight.selectedObjectIds);
    const preselectedObjectId = highlight.preselectedObjectId;
    const preselectedPrimitiveId = highlight.preselectedPrimitiveId;
    const selectedPrimitiveId = highlight.selectedPrimitiveId;

    for (const object of scene.objects) {
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

        appendCube(
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

export function toVertexBuffer(vertices: readonly LineVertex[]): Float32Array {
    const values: number[] = [];

    for (const vertex of vertices) {
        values.push(
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.color.x,
            vertex.color.y,
            vertex.color.z,
        );
    }

    return new Float32Array(values);
}

function appendAxis(vertices: LineVertex[], length: number): void {
    appendLine(vertices, vector3(0, 0, 0), vector3(length, 0, 0), vector3(0.95, 0.2, 0.18));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, length, 0), vector3(0.2, 0.8, 0.32));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, 0, length), vector3(0.28, 0.55, 1));
}

function appendGrid(vertices: LineVertex[], size: number, divisions: number): void {
    const halfSize = size / 2;
    const step = size / divisions;
    const color = vector3(0.24, 0.3, 0.36);

    for (let index = 0; index <= divisions; index += 1) {
        const offset = -halfSize + index * step;
        const lineColor = index === divisions / 2 ? vector3(0.42, 0.49, 0.58) : color;

        appendLine(
            vertices,
            vector3(-halfSize, 0, offset),
            vector3(halfSize, 0, offset),
            lineColor,
        );
        appendLine(
            vertices,
            vector3(offset, 0, -halfSize),
            vector3(offset, 0, halfSize),
            lineColor,
        );
    }
}

function appendCube(
    vertices: LineVertex[],
    cube: CubeWireframeSceneObject,
    selected: boolean,
    preselected: boolean,
    selectedPrimitiveId: string | null,
    preselectedPrimitiveId: string | null,
): void {
    const halfSize = cube.size / 2;
    const points = [
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
    ] as const;
    const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
    ] as const;

    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1) {
        const [startIndex, endIndex] = getCubeEdge(edges, edgeIndex);
        const primitiveId = createRenderPrimitiveId(cube.id, 'edge', edgeIndex);
        const edgeSelected = selectedPrimitiveId ? selectedPrimitiveId === primitiveId : selected;
        const edgePreselected =
            !edgeSelected &&
            (preselectedPrimitiveId ? preselectedPrimitiveId === primitiveId : preselected);
        const color = getCubeColor(edgeSelected, edgePreselected);

        appendLine(
            vertices,
            getCubePoint(points, startIndex),
            getCubePoint(points, endIndex),
            color,
        );
    }
}

function getCubePoint(points: readonly Vector3[], pointIndex: number): Vector3 {
    const point = points[pointIndex];

    if (!point) {
        throw new Error('立方体线框渲染失败：顶点索引超出范围');
    }

    return point;
}

function getCubeEdge(
    edges: readonly (readonly [number, number])[],
    edgeIndex: number,
): readonly [number, number] {
    const edge = edges[edgeIndex];

    if (!edge) {
        throw new Error('立方体线框渲染失败：边索引超出范围');
    }

    return edge;
}

function getCubeColor(selected: boolean, preselected: boolean): Vector3 {
    if (selected) {
        return vector3(0.24, 0.68, 1);
    }

    if (preselected) {
        return vector3(0.86, 0.95, 1);
    }

    return vector3(0.92, 0.74, 0.34);
}

function appendLine(vertices: LineVertex[], start: Vector3, end: Vector3, color: Vector3): void {
    vertices.push({ position: start, color }, { position: end, color });
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
