import type {
    CubeWireframeDisplayObject,
    DisplayModel,
    LineBatchDisplayObject,
    LineSegmentsDisplayObject,
} from '@occt-draw/display';
import {
    crossVector3,
    dotVector3,
    normalizeVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import { createRenderPrimitiveId } from './primitiveId';
import type { CameraState, ViewportSize } from './types';

export type PickTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface PickDisplayObjectInput {
    readonly camera: CameraState;
    readonly displayModel: DisplayModel;
    readonly point: ScreenPoint2;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface PickDisplayObjectResult {
    readonly distancePixels: number;
    readonly objectId: string;
    readonly primitiveId: string | null;
    readonly targetKind: PickTargetKind;
}

export interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

interface CameraBasis {
    readonly right: Vector3;
    readonly up: Vector3;
}

export function pickDisplayObject(input: PickDisplayObjectInput): PickDisplayObjectResult | null {
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (const object of input.displayModel.objects) {
        if (!object.visible) {
            continue;
        }

        const result =
            object.kind === 'cube-wireframe'
                ? pickCubeWireframeEdge(object, input)
                : pickLineSegmentsObject(object, input);

        if (result && result.distancePixels <= nearestDistance) {
            nearestDistance = result.distancePixels;
            nearestResult = result;
        }
    }

    return nearestResult;
}

function pickLineSegmentsObject(
    object: DisplayModel['objects'][number],
    input: PickDisplayObjectInput,
): PickDisplayObjectResult | null {
    if (object.kind !== 'line-batch' && object.kind !== 'line-segments') {
        return null;
    }

    return pickLineSegments(object, input);
}

function pickLineSegments(
    object: LineBatchDisplayObject | LineSegmentsDisplayObject,
    input: PickDisplayObjectInput,
): PickDisplayObjectResult | null {
    const basis = calculateCameraBasis(input.camera);
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.segments.length; index += 1) {
        const segment = object.segments[index];

        if (!segment) {
            continue;
        }

        const start = projectWorldToScreen(segment.start, input.camera, basis, input.viewportSize);
        const end = projectWorldToScreen(segment.end, input.camera, basis, input.viewportSize);
        const distance = distanceToScreenSegment(input.point, start, end);

        if (distance <= nearestDistance) {
            nearestDistance = distance;
            nearestResult = {
                distancePixels: distance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'edge', index),
                targetKind: 'object',
            };
        }
    }

    return nearestResult;
}

function pickCubeWireframeEdge(
    cube: CubeWireframeDisplayObject,
    input: PickDisplayObjectInput,
): PickDisplayObjectResult | null {
    const points = createCubePoints(cube);
    const basis = calculateCameraBasis(input.camera);
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let edgeIndex = 0; edgeIndex < CUBE_EDGES.length; edgeIndex += 1) {
        const edge = getCubeEdge(edgeIndex);
        const startPoint = getCubePoint(points, edge[0]);
        const endPoint = getCubePoint(points, edge[1]);
        const start = projectWorldToScreen(startPoint, input.camera, basis, input.viewportSize);
        const end = projectWorldToScreen(endPoint, input.camera, basis, input.viewportSize);
        const distance = distanceToScreenSegment(input.point, start, end);

        if (distance <= nearestDistance) {
            nearestDistance = distance;
            nearestResult = {
                distancePixels: distance,
                objectId: cube.id,
                primitiveId: createCubeEdgePrimitiveId(cube.id, edgeIndex),
                targetKind: 'edge',
            };
        }
    }

    return nearestResult;
}

function createCubeEdgePrimitiveId(objectId: string, edgeIndex: number): string {
    return createRenderPrimitiveId(objectId, 'edge', edgeIndex);
}

function getCubeEdge(index: number): readonly [number, number] {
    const edge = CUBE_EDGES[index];

    if (!edge) {
        throw new Error('立方体拾取失败：边索引超出范围');
    }

    return edge;
}

function getCubePoint(points: readonly Vector3[], index: number): Vector3 {
    const point = points[index];

    if (!point) {
        throw new Error('立方体拾取失败：顶点索引超出范围');
    }

    return point;
}

function createCubePoints(cube: CubeWireframeDisplayObject): readonly Vector3[] {
    const halfSize = cube.size / 2;

    return [
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
    ];
}

const CUBE_EDGES = [
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

function calculateCameraBasis(camera: CameraState): CameraBasis {
    const view = normalizeVector3(subtractVector3(camera.position, camera.target));
    const right = normalizeVector3(crossVector3(camera.up, view));
    const up = normalizeVector3(crossVector3(view, right));

    return { right, up };
}

function projectWorldToScreen(
    point: Vector3,
    camera: CameraState,
    basis: CameraBasis,
    viewportSize: ViewportSize,
): ScreenPoint2 {
    const relative = subtractVector3(point, camera.target);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const halfHeight = camera.orthographicHeight / 2;
    const halfWidth = halfHeight * aspect;
    const projectedX = dotVector3(relative, basis.right);
    const projectedY = dotVector3(relative, basis.up);

    return {
        x: ((projectedX / halfWidth + 1) / 2) * viewportSize.width,
        y: ((1 - projectedY / halfHeight) / 2) * viewportSize.height,
    };
}

function distanceToScreenSegment(
    point: ScreenPoint2,
    start: ScreenPoint2,
    end: ScreenPoint2,
): number {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (lengthSquared <= 1e-8) {
        return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const ratio = Math.min(
        Math.max(
            ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
            0,
        ),
        1,
    );
    const closestX = start.x + segmentX * ratio;
    const closestY = start.y + segmentY * ratio;

    return Math.hypot(point.x - closestX, point.y - closestY);
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
