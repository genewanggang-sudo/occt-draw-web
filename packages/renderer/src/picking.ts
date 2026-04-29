import type {
    DisplayModel,
    DisplayNavigationRole,
    LineBatchDisplayObject,
    MarkerBatchDisplayObject,
    PointBatchDisplayObject,
    SurfaceBatchDisplayObject,
} from '@occt-draw/display';
import {
    addVector3,
    crossVector3,
    dotVector3,
    normalizeVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import { createRenderPrimitiveId } from './primitiveId';
import type { CameraState, ScreenPoint2, ViewportSize } from './types';

export type PickTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface PickDisplayObjectInput {
    readonly camera: CameraState;
    readonly displayModel: DisplayModel;
    readonly point: ScreenPoint2;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface PickDisplayObjectResult {
    readonly depth: number;
    readonly distancePixels: number;
    readonly objectId: string;
    readonly primitiveId: string | null;
    readonly role: DisplayNavigationRole;
    readonly targetKind: PickTargetKind;
    readonly worldPoint: Vector3;
}

interface CameraBasis {
    readonly forward: Vector3;
    readonly right: Vector3;
    readonly up: Vector3;
}

interface ScreenRay {
    readonly direction: Vector3;
    readonly origin: Vector3;
}

const DEPTH_EPSILON = 1e-6;

export function pickDisplayObject(input: PickDisplayObjectInput): PickDisplayObjectResult | null {
    return pickDisplayHit(input, () => true);
}

function pickDisplayHit(
    input: PickDisplayObjectInput,
    shouldIncludeRole: (role: DisplayNavigationRole) => boolean,
): PickDisplayObjectResult | null {
    const basis = calculateCameraBasis(input.camera);
    const ray = screenPointToWorldRay(input.point, input.camera, basis, input.viewportSize);
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestScreenDistance = input.thresholdPixels;

    for (const object of input.displayModel.objects) {
        if (
            !object.visible ||
            object.navigationRole === 'annotation' ||
            !shouldIncludeRole(object.navigationRole)
        ) {
            continue;
        }

        const result =
            object.kind === 'marker-batch'
                ? pickMarkerBatch(object, input, basis)
                : object.kind === 'point-batch'
                  ? pickPointBatch(object, input, basis)
                  : object.kind === 'line-batch'
                    ? pickLineBatch(object, input, basis)
                    : object.kind === 'surface-batch'
                      ? pickSurfaceBatch(object, input, basis, ray)
                      : null;

        if (!result) {
            continue;
        }

        const betterScreenHit = result.distancePixels < nearestScreenDistance - DEPTH_EPSILON;
        const equalScreenCloserDepth =
            Math.abs(result.distancePixels - nearestScreenDistance) <= DEPTH_EPSILON &&
            (!nearestResult || result.depth < nearestResult.depth);

        if (betterScreenHit || equalScreenCloserDepth) {
            nearestScreenDistance = result.distancePixels;
            nearestResult = result;
        }
    }

    return nearestResult;
}

function pickLineBatch(
    object: LineBatchDisplayObject,
    input: PickDisplayObjectInput,
    basis: CameraBasis,
): PickDisplayObjectResult | null {
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.segments.length; index += 1) {
        const segment = object.segments[index];

        if (!segment) {
            continue;
        }

        const start = projectWorldToScreen(segment.start, input.camera, basis, input.viewportSize);
        const end = projectWorldToScreen(segment.end, input.camera, basis, input.viewportSize);
        const closest = closestPointOnScreenSegment(input.point, start, end);

        if (closest.distancePixels <= nearestDistance) {
            const worldPoint = addVector3(
                segment.start,
                scaleVector3(subtractVector3(segment.end, segment.start), closest.ratio),
            );
            nearestDistance = closest.distancePixels;
            nearestResult = {
                depth: calculateDepth(input.camera, basis, worldPoint),
                distancePixels: closest.distancePixels,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'edge', index),
                role: object.navigationRole,
                targetKind: 'object',
                worldPoint,
            };
        }
    }

    return nearestResult;
}

function pickMarkerBatch(
    object: MarkerBatchDisplayObject,
    input: PickDisplayObjectInput,
    basis: CameraBasis,
): PickDisplayObjectResult | null {
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.markers.length; index += 1) {
        const marker = object.markers[index];

        if (!marker) {
            continue;
        }

        const screenPoint = projectWorldToScreen(
            marker.position,
            input.camera,
            basis,
            input.viewportSize,
        );
        const distance = Math.hypot(input.point.x - screenPoint.x, input.point.y - screenPoint.y);
        const hitDistance = Math.max(0, distance - marker.sizePixels / 2);

        if (hitDistance <= nearestDistance) {
            nearestDistance = hitDistance;
            nearestResult = {
                depth: calculateDepth(input.camera, basis, marker.position),
                distancePixels: hitDistance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
                role: object.navigationRole,
                targetKind: 'vertex',
                worldPoint: marker.position,
            };
        }
    }

    return nearestResult;
}

function pickPointBatch(
    object: PointBatchDisplayObject,
    input: PickDisplayObjectInput,
    basis: CameraBasis,
): PickDisplayObjectResult | null {
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.points.length; index += 1) {
        const point = object.points[index];

        if (!point) {
            continue;
        }

        const screenPoint = projectWorldToScreen(point, input.camera, basis, input.viewportSize);
        const distance = Math.hypot(input.point.x - screenPoint.x, input.point.y - screenPoint.y);
        const hitDistance = Math.max(0, distance - object.sizePixels / 2);

        if (hitDistance <= nearestDistance) {
            nearestDistance = hitDistance;
            nearestResult = {
                depth: calculateDepth(input.camera, basis, point),
                distancePixels: hitDistance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
                role: object.navigationRole,
                targetKind: 'vertex',
                worldPoint: point,
            };
        }
    }

    return nearestResult;
}

function pickSurfaceBatch(
    object: SurfaceBatchDisplayObject,
    input: PickDisplayObjectInput,
    basis: CameraBasis,
    ray: ScreenRay,
): PickDisplayObjectResult | null {
    let nearestResult: PickDisplayObjectResult | null = null;
    let nearestDepth = Number.POSITIVE_INFINITY;

    for (let index = 0; index < object.triangles.length; index += 1) {
        const triangle = object.triangles[index];

        if (!triangle) {
            continue;
        }

        const worldPoint = intersectRayWithTriangle(ray, triangle.a, triangle.b, triangle.c);

        if (!worldPoint) {
            continue;
        }

        const depth = calculateDepth(input.camera, basis, worldPoint);

        if (depth >= 0 && depth < nearestDepth) {
            nearestDepth = depth;
            nearestResult = {
                depth,
                distancePixels: 0,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'face', index),
                role: object.navigationRole,
                targetKind: 'face',
                worldPoint,
            };
        }
    }

    return nearestResult;
}

function calculateCameraBasis(camera: CameraState): CameraBasis {
    const forward = normalizeVector3(subtractVector3(camera.target, camera.position));
    const right = normalizeVector3(crossVector3(forward, camera.up));
    const up = normalizeVector3(crossVector3(right, forward));

    return { forward, right, up };
}

function projectWorldToScreen(
    point: Vector3,
    camera: CameraState,
    basis: CameraBasis,
    viewportSize: ViewportSize,
): ScreenPoint2 {
    const relative = subtractVector3(point, camera.target);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const halfHeight = getViewHeight(camera) / 2;
    const halfWidth = halfHeight * aspect;
    const projectedX = dotVector3(relative, basis.right);
    const projectedY = dotVector3(relative, basis.up);

    return {
        x: ((projectedX / halfWidth + 1) / 2) * viewportSize.width,
        y: ((1 - projectedY / halfHeight) / 2) * viewportSize.height,
    };
}

function screenPointToWorldRay(
    point: ScreenPoint2,
    camera: CameraState,
    basis: CameraBasis,
    viewportSize: ViewportSize,
): ScreenRay {
    const height = getViewHeight(camera);
    const width = height * (viewportSize.width / viewportSize.height);
    const x = (point.x / viewportSize.width - 0.5) * width;
    const y = (0.5 - point.y / viewportSize.height) * height;
    const viewPlanePoint = addVector3(
        camera.target,
        addVector3(scaleVector3(basis.right, x), scaleVector3(basis.up, y)),
    );

    if (camera.projection === 'perspective') {
        return {
            direction: normalizeVector3(subtractVector3(viewPlanePoint, camera.position)),
            origin: camera.position,
        };
    }

    return {
        direction: basis.forward,
        origin: subtractVector3(
            viewPlanePoint,
            scaleVector3(basis.forward, calculateDepth(camera, basis, camera.target)),
        ),
    };
}

function calculateDepth(camera: CameraState, basis: CameraBasis, point: Vector3): number {
    return dotVector3(subtractVector3(point, camera.position), basis.forward);
}

function getViewHeight(camera: CameraState): number {
    if (camera.projection === 'orthographic') {
        return camera.orthographicHeight;
    }

    const distance = Math.max(
        0.001,
        Math.hypot(
            camera.position.x - camera.target.x,
            camera.position.y - camera.target.y,
            camera.position.z - camera.target.z,
        ),
    );

    return 2 * distance * Math.tan(camera.fovYRadians / 2);
}

function closestPointOnScreenSegment(
    point: ScreenPoint2,
    start: ScreenPoint2,
    end: ScreenPoint2,
): { readonly distancePixels: number; readonly ratio: number } {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (lengthSquared <= 1e-8) {
        return {
            distancePixels: Math.hypot(point.x - start.x, point.y - start.y),
            ratio: 0,
        };
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

    return {
        distancePixels: Math.hypot(point.x - closestX, point.y - closestY),
        ratio,
    };
}

function intersectRayWithTriangle(
    ray: ScreenRay,
    a: Vector3,
    b: Vector3,
    c: Vector3,
): Vector3 | null {
    const edge1 = subtractVector3(b, a);
    const edge2 = subtractVector3(c, a);
    const h = crossVector3(ray.direction, edge2);
    const determinant = dotVector3(edge1, h);

    if (Math.abs(determinant) <= 1e-8) {
        return null;
    }

    const inverseDeterminant = 1 / determinant;
    const s = subtractVector3(ray.origin, a);
    const u = inverseDeterminant * dotVector3(s, h);

    if (u < 0 || u > 1) {
        return null;
    }

    const q = crossVector3(s, edge1);
    const v = inverseDeterminant * dotVector3(ray.direction, q);

    if (v < 0 || u + v > 1) {
        return null;
    }

    const distance = inverseDeterminant * dotVector3(edge2, q);

    if (distance < 0) {
        return null;
    }

    return addVector3(ray.origin, scaleVector3(ray.direction, distance));
}
