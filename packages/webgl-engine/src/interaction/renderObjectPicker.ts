import {
    DEFAULT_TOLERANCE,
    Distance,
    Intersection,
    LineSegment2,
    Measurement,
    Vec2,
    type Ray3,
    type Vector3,
} from '@occt-draw/math';
import type { RenderGraph } from '../core';
import { collectPickableGraphObjects } from '../graphTraversal';
import { createRenderPrimitiveId } from '../primitiveId';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from '../scene';
import type { CameraState, ScreenPoint2, ViewportSize } from '../types';
import {
    calculateCameraBasis,
    calculateViewDepth,
    projectWorldToScreen,
    screenPointToWorldRay,
    type CameraBasis,
} from '../cameraGeometry';

export type PickTargetKind = 'edge' | 'face' | 'object' | 'vertex';

export interface PickRenderObjectInput {
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly point: ScreenPoint2;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface PickKey {
    readonly kind: PickTargetKind;
    readonly objectId: string;
    readonly primitiveId?: string;
}

export interface PickResult {
    readonly canvasPoint: ScreenPoint2;
    readonly depth01?: number;
    readonly distancePixels?: number;
    readonly key: PickKey;
    readonly worldPoint?: unknown;
}

interface PickRenderObjectHit {
    readonly depth: number;
    readonly distancePixels: number;
    readonly objectId: string;
    readonly primitiveId: string | null;
    readonly targetKind: PickTargetKind;
    readonly worldPoint: Vector3;
}

const DEPTH_EPSILON = DEFAULT_TOLERANCE.distance;

export class RenderObjectPicker {
    public pick(input: PickRenderObjectInput): PickResult | null {
        const hit = pickDisplayHit(input);

        if (!hit) {
            return null;
        }

        return {
            canvasPoint: input.point,
            distancePixels: hit.distancePixels,
            key:
                hit.primitiveId === null
                    ? {
                          kind: hit.targetKind,
                          objectId: hit.objectId,
                      }
                    : {
                          kind: hit.targetKind,
                          objectId: hit.objectId,
                          primitiveId: hit.primitiveId,
                      },
            worldPoint: hit.worldPoint,
        };
    }
}

function pickDisplayHit(input: PickRenderObjectInput): PickRenderObjectHit | null {
    const basis = calculateCameraBasis(input.camera);
    const ray = screenPointToWorldRay(input.point, input.camera, input.viewportSize, basis);
    let nearestResult: PickRenderObjectHit | null = null;
    let nearestScreenDistance = input.thresholdPixels;

    for (const { object } of collectPickableGraphObjects(input.graph)) {
        const result =
            object instanceof MarkerSet
                ? pickMarkerSet(object, input, basis)
                : object instanceof PointSet
                  ? pickPointSet(object, input, basis)
                  : object instanceof EdgeSet
                    ? pickEdgeSet(object, input, basis)
                    : object instanceof FaceSet
                      ? pickFaceSet(object, input, basis, ray)
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

function pickEdgeSet(
    object: EdgeSet,
    input: PickRenderObjectInput,
    basis: CameraBasis,
): PickRenderObjectHit | null {
    let nearestResult: PickRenderObjectHit | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.geometry.segments.length; index += 1) {
        const segment = object.geometry.segments[index];

        if (!segment) {
            continue;
        }

        const start = projectWorldToScreen(segment.start, input.camera, input.viewportSize, basis);
        const end = projectWorldToScreen(segment.end, input.camera, input.viewportSize, basis);
        const closest = Distance.pointToSegment2(
            Vec2.from(input.point),
            new LineSegment2(Vec2.from(start), Vec2.from(end)),
        );

        if (!closest.success || closest.distance > nearestDistance) {
            continue;
        }

        const worldPoint = segment.pointAt(closest.parameter);
        nearestDistance = closest.distance;
        nearestResult = {
            depth: calculateViewDepth(input.camera, basis, worldPoint),
            distancePixels: closest.distance,
            objectId: object.id,
            primitiveId: createRenderPrimitiveId(object.id, 'edge', index),
            targetKind: 'object',
            worldPoint,
        };
    }

    return nearestResult;
}

function pickMarkerSet(
    object: MarkerSet,
    input: PickRenderObjectInput,
    basis: CameraBasis,
): PickRenderObjectHit | null {
    let nearestResult: PickRenderObjectHit | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.geometry.markers.length; index += 1) {
        const marker = object.geometry.markers[index];

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

        if (hitDistance > nearestDistance) {
            continue;
        }

        nearestDistance = hitDistance;
        nearestResult = {
            depth: calculateViewDepth(input.camera, basis, marker.position),
            distancePixels: hitDistance,
            objectId: object.id,
            primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
            targetKind: 'vertex',
            worldPoint: marker.position,
        };
    }

    return nearestResult;
}

function pickPointSet(
    object: PointSet,
    input: PickRenderObjectInput,
    basis: CameraBasis,
): PickRenderObjectHit | null {
    let nearestResult: PickRenderObjectHit | null = null;
    let nearestDistance = input.thresholdPixels;

    for (let index = 0; index < object.geometry.points.length; index += 1) {
        const point = object.geometry.points[index];

        if (!point) {
            continue;
        }

        const screenPoint = projectWorldToScreen(point, input.camera, input.viewportSize, basis);
        const distance = Measurement.distance2(input.point, screenPoint).value;
        const hitDistance = Math.max(0, distance - object.style.sizePixels / 2);

        if (hitDistance > nearestDistance) {
            continue;
        }

        nearestDistance = hitDistance;
        nearestResult = {
            depth: calculateViewDepth(input.camera, basis, point),
            distancePixels: hitDistance,
            objectId: object.id,
            primitiveId: createRenderPrimitiveId(object.id, 'vertex', index),
            targetKind: 'vertex',
            worldPoint: point,
        };
    }

    return nearestResult;
}

function pickFaceSet(
    object: FaceSet,
    input: PickRenderObjectInput,
    basis: CameraBasis,
    ray: Ray3,
): PickRenderObjectHit | null {
    let nearestResult: PickRenderObjectHit | null = null;
    let nearestDepth = Number.POSITIVE_INFINITY;

    for (let index = 0; index < object.geometry.triangles.length; index += 1) {
        const triangle = object.geometry.triangles[index];

        if (!triangle) {
            continue;
        }

        const intersection = Intersection.rayTriangle3(ray, triangle);

        if (!intersection.success || !intersection.value) {
            continue;
        }

        const worldPoint = intersection.value;
        const depth = calculateViewDepth(input.camera, basis, worldPoint);

        if (depth < 0 || depth >= nearestDepth) {
            continue;
        }

        nearestDepth = depth;
        nearestResult = {
            depth,
            distancePixels: 0,
            objectId: object.id,
            primitiveId: createRenderPrimitiveId(object.id, 'face', index),
            targetKind: 'face',
            worldPoint,
        };
    }

    return nearestResult;
}
