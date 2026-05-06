import type {
    RenderScene,
    RenderDepthRole,
    LineBatchRenderNode,
    MarkerBatchRenderNode,
    PointBatchRenderNode,
    SurfaceBatchRenderNode,
} from './types';
import {
    Distance,
    Intersection,
    LineSegment2,
    Measurement,
    Vec2,
    type Ray3,
    type Vector3,
} from '@occt-draw/math';
import { createRenderPrimitiveId } from './primitiveId';
import type { CameraState, ScreenPoint2, ViewportSize } from './types';
import {
    calculateCameraBasis,
    calculateViewDepth,
    projectWorldToScreen,
    screenPointToWorldRay,
    type CameraBasis,
} from './cameraGeometry';

export type PickTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface PickRenderNodeInput {
    readonly camera: CameraState;
    readonly scene: RenderScene;
    readonly point: ScreenPoint2;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface PickRenderNodeResult {
    readonly depth: number;
    readonly distancePixels: number;
    readonly objectId: string;
    readonly primitiveId: string | null;
    readonly role: RenderDepthRole;
    readonly targetKind: PickTargetKind;
    readonly worldPoint: Vector3;
}

const DEPTH_EPSILON = 1e-6;

export function pickRenderNode(input: PickRenderNodeInput): PickRenderNodeResult | null {
    return pickDisplayHit(input, () => true);
}

function pickDisplayHit(
    input: PickRenderNodeInput,
    shouldIncludeRole: (role: RenderDepthRole) => boolean,
): PickRenderNodeResult | null {
    const basis = calculateCameraBasis(input.camera);
    const ray = screenPointToWorldRay(input.point, input.camera, input.viewportSize, basis);
    let nearestResult: PickRenderNodeResult | null = null;
    let nearestScreenDistance = input.thresholdPixels;

    for (const object of input.scene.nodes) {
        if (
            !object.visible ||
            object.depthRole === 'excluded' ||
            !shouldIncludeRole(object.depthRole)
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
    object: LineBatchRenderNode,
    input: PickRenderNodeInput,
    basis: CameraBasis,
): PickRenderNodeResult | null {
    let nearestResult: PickRenderNodeResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.segments.length; index += 1) {
        const segment = object.segments[index];

        if (!segment) {
            continue;
        }

        const start = projectWorldToScreen(segment.start, input.camera, input.viewportSize, basis);
        const end = projectWorldToScreen(segment.end, input.camera, input.viewportSize, basis);
        const closest = Distance.pointToSegment2(
            Vec2.from(input.point),
            new LineSegment2(Vec2.from(start), Vec2.from(end)),
        );

        if (closest.distance <= nearestDistance) {
            const worldPoint = segment.pointAt(closest.parameter);
            nearestDistance = closest.distance;
            nearestResult = {
                depth: calculateViewDepth(input.camera, basis, worldPoint),
                distancePixels: closest.distance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'edge', index),
                role: object.depthRole,
                targetKind: 'object',
                worldPoint,
            };
        }
    }

    return nearestResult;
}

function pickMarkerBatch(
    object: MarkerBatchRenderNode,
    input: PickRenderNodeInput,
    basis: CameraBasis,
): PickRenderNodeResult | null {
    let nearestResult: PickRenderNodeResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.markers.length; index += 1) {
        const marker = object.markers[index];

        if (!marker) {
            continue;
        }

        const screenPoint = projectWorldToScreen(
            marker.position,
            input.camera,
            input.viewportSize,
            basis,
        );
        const distance = Measurement.distance2(input.point, screenPoint).value;
        const hitDistance = Math.max(0, distance - marker.sizePixels / 2);

        if (hitDistance <= nearestDistance) {
            nearestDistance = hitDistance;
            nearestResult = {
                depth: calculateViewDepth(input.camera, basis, marker.position),
                distancePixels: hitDistance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
                role: object.depthRole,
                targetKind: 'vertex',
                worldPoint: marker.position,
            };
        }
    }

    return nearestResult;
}

function pickPointBatch(
    object: PointBatchRenderNode,
    input: PickRenderNodeInput,
    basis: CameraBasis,
): PickRenderNodeResult | null {
    let nearestResult: PickRenderNodeResult | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.points.length; index += 1) {
        const point = object.points[index];

        if (!point) {
            continue;
        }

        const screenPoint = projectWorldToScreen(point, input.camera, input.viewportSize, basis);
        const distance = Measurement.distance2(input.point, screenPoint).value;
        const hitDistance = Math.max(0, distance - object.sizePixels / 2);

        if (hitDistance <= nearestDistance) {
            nearestDistance = hitDistance;
            nearestResult = {
                depth: calculateViewDepth(input.camera, basis, point),
                distancePixels: hitDistance,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
                role: object.depthRole,
                targetKind: 'vertex',
                worldPoint: point,
            };
        }
    }

    return nearestResult;
}

function pickSurfaceBatch(
    object: SurfaceBatchRenderNode,
    input: PickRenderNodeInput,
    basis: CameraBasis,
    ray: Ray3,
): PickRenderNodeResult | null {
    let nearestResult: PickRenderNodeResult | null = null;
    let nearestDepth = Number.POSITIVE_INFINITY;

    for (let index = 0; index < object.triangles.length; index += 1) {
        const triangle = object.triangles[index];

        if (!triangle) {
            continue;
        }

        const worldPoint = Intersection.rayTriangle3(ray, triangle).value;

        if (!worldPoint) {
            continue;
        }

        const depth = calculateViewDepth(input.camera, basis, worldPoint);

        if (depth >= 0 && depth < nearestDepth) {
            nearestDepth = depth;
            nearestResult = {
                depth,
                distancePixels: 0,
                objectId: object.id,
                primitiveId: createRenderPrimitiveId(object.id, 'face', index),
                role: object.depthRole,
                targetKind: 'face',
                worldPoint,
            };
        }
    }

    return nearestResult;
}
