import {
    crossVector3,
    dotVector3,
    normalizeVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { CameraState, ViewportSize } from '@occt-draw/renderer';
import type { CubeWireframeSceneObject, SceneDocument } from '@occt-draw/scene';

export interface PickSceneObjectInput {
    readonly camera: CameraState;
    readonly point: ScreenPoint2;
    readonly scene: SceneDocument;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface PickSceneObjectResult {
    readonly distancePixels: number;
    readonly objectId: string;
}

interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

interface CameraBasis {
    readonly right: Vector3;
    readonly up: Vector3;
}

export function pickSceneObject(input: PickSceneObjectInput): PickSceneObjectResult | null {
    let nearestResult: PickSceneObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (const object of input.scene.objects) {
        if (!object.visible || object.kind !== 'cube-wireframe') {
            continue;
        }

        const distance = measureCubeScreenDistance(object, input);

        if (distance <= nearestDistance) {
            nearestDistance = distance;
            nearestResult = {
                distancePixels: distance,
                objectId: object.id,
            };
        }
    }

    return nearestResult;
}

function measureCubeScreenDistance(
    cube: CubeWireframeSceneObject,
    input: PickSceneObjectInput,
): number {
    const points = createCubePoints(cube);
    const basis = calculateCameraBasis(input.camera);
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const [startIndex, endIndex] of CUBE_EDGES) {
        const startPoint = getCubePoint(points, startIndex);
        const endPoint = getCubePoint(points, endIndex);
        const start = projectWorldToScreen(startPoint, input.camera, basis, input.viewportSize);
        const end = projectWorldToScreen(endPoint, input.camera, basis, input.viewportSize);

        nearestDistance = Math.min(
            nearestDistance,
            distanceToScreenSegment(input.point, start, end),
        );
    }

    return nearestDistance;
}

function getCubePoint(points: readonly Vector3[], index: number): Vector3 {
    const point = points[index];

    if (!point) {
        throw new Error('立方体拾取失败：边索引超出顶点范围');
    }

    return point;
}

function createCubePoints(cube: CubeWireframeSceneObject): readonly Vector3[] {
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
