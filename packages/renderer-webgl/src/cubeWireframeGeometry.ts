import type { CubeWireframeDisplayObject } from '@occt-draw/display';
import type { Vector3 } from '@occt-draw/math';
import { createRenderPrimitiveId } from '@occt-draw/renderer';
import type { LineVertex } from './types';

export function appendCubeWireframe(
    vertices: LineVertex[],
    cube: CubeWireframeDisplayObject,
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
    vertices.push({ position: start, color, alpha: 1 }, { position: end, color, alpha: 1 });
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
