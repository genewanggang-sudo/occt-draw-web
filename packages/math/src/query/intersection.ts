import { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { Ray3 } from '../geometry-3d/ray3';
import type { Triangle3 } from '../geometry-3d/triangle3';
import type { Vec2 } from '../linear/vec2';
import { Vec3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export type IntersectionResult<TValue> = GeometryResult<TValue>;

export interface SegmentSegment2PointIntersection {
    readonly kind: 'point';
    readonly leftParameters: readonly [number, number];
    readonly point: Vec2;
    readonly rightParameters: readonly [number, number];
}

export interface SegmentSegment2OverlapIntersection {
    readonly kind: 'overlap';
    readonly leftParameters: readonly [number, number];
    readonly overlap: LineSegment2;
    readonly rightParameters: readonly [number, number];
}

export type SegmentSegment2Intersection =
    | SegmentSegment2OverlapIntersection
    | SegmentSegment2PointIntersection;

export const Intersection = {
    segments2(left: LineSegment2, right: LineSegment2): IntersectionResult<Vec2> {
        if (!left.isValid() || !right.isValid()) {
            return GeometryResult.degenerate();
        }

        const p = left.start;
        const r = left.start.vectorTo(left.end);
        const q = right.start;
        const s = right.start.vectorTo(right.end);
        const denominator = r.cross(s);
        const qMinusP = p.vectorTo(q);

        if (DEFAULT_TOLERANCE.isNearZero(denominator)) {
            if (!DEFAULT_TOLERANCE.isNearZero(qMinusP.cross(r))) {
                return GeometryResult.parallel();
            }

            return collinearSegmentsOverlap(qMinusP, r, s)
                ? GeometryResult.coincident()
                : GeometryResult.empty();
        }

        const t = qMinusP.cross(s) / denominator;
        const u = qMinusP.cross(r) / denominator;

        if (!isUnitParameter(t) || !isUnitParameter(u)) {
            return GeometryResult.empty();
        }

        return GeometryResult.success(left.pointAt(clampUnitParameter(t)));
    },

    segmentSegment2Detailed(
        left: LineSegment2,
        right: LineSegment2,
    ): IntersectionResult<SegmentSegment2Intersection> {
        if (!left.isValid() || !right.isValid()) {
            return GeometryResult.degenerate();
        }

        const leftVector = left.start.vectorTo(left.end);
        const rightVector = right.start.vectorTo(right.end);
        const denominator = leftVector.cross(rightVector);
        const startDelta = left.start.vectorTo(right.start);

        if (DEFAULT_TOLERANCE.isNearZero(denominator)) {
            if (!DEFAULT_TOLERANCE.isNearZero(startDelta.cross(leftVector))) {
                return GeometryResult.parallel();
            }

            return collinearSegmentsIntersection(left, right, leftVector, rightVector);
        }

        const leftParameter = startDelta.cross(rightVector) / denominator;
        const rightParameter = startDelta.cross(leftVector) / denominator;

        if (!isUnitParameter(leftParameter) || !isUnitParameter(rightParameter)) {
            return GeometryResult.empty();
        }

        const clampedLeftParameter = clampUnitParameter(leftParameter);
        const clampedRightParameter = clampUnitParameter(rightParameter);

        return GeometryResult.success({
            kind: 'point',
            leftParameters: [clampedLeftParameter, clampedLeftParameter],
            point: left.pointAt(clampedLeftParameter),
            rightParameters: [clampedRightParameter, clampedRightParameter],
        });
    },

    rayTriangle3(ray: Ray3, triangle: Triangle3): IntersectionResult<Vec3> {
        if (!ray.isValid()) {
            return GeometryResult.degenerate();
        }

        const edge1 = Vec3.subtract(triangle.b, triangle.a);
        const edge2 = Vec3.subtract(triangle.c, triangle.a);
        const normal = edge1.cross(edge2);

        if (DEFAULT_TOLERANCE.isNearZeroSquared(normal.lengthSquared())) {
            return GeometryResult.degenerate();
        }

        const h = ray.direction.cross(edge2);
        const determinant = edge1.dot(h);

        if (DEFAULT_TOLERANCE.isNearZero(determinant)) {
            return GeometryResult.parallel();
        }

        const inverseDeterminant = 1 / determinant;
        const s = Vec3.subtract(ray.origin, triangle.a);
        const u = inverseDeterminant * s.dot(h);

        if (!isUnitParameter(u)) {
            return GeometryResult.empty();
        }

        const q = s.cross(edge1);
        const v = inverseDeterminant * ray.direction.dot(q);

        if (!isUnitParameter(v) || u + v > 1 + DEFAULT_TOLERANCE.parameter) {
            return GeometryResult.empty();
        }

        const distance = inverseDeterminant * edge2.dot(q);

        return distance < -DEFAULT_TOLERANCE.distance
            ? GeometryResult.empty()
            : GeometryResult.success(ray.pointAt(Math.max(distance, 0)));
    },
} as const;

function isUnitParameter(value: number): boolean {
    return value >= -DEFAULT_TOLERANCE.parameter && value <= 1 + DEFAULT_TOLERANCE.parameter;
}

function clampUnitParameter(value: number): number {
    if (value <= DEFAULT_TOLERANCE.parameter) {
        return 0;
    }

    if (value >= 1 - DEFAULT_TOLERANCE.parameter) {
        return 1;
    }

    return value;
}

function collinearSegmentsIntersection(
    left: LineSegment2,
    right: LineSegment2,
    leftVector: Vec2,
    rightVector: Vec2,
): IntersectionResult<SegmentSegment2Intersection> {
    const leftLengthSquared = leftVector.lengthSquared();
    const rightLengthSquared = rightVector.lengthSquared();
    const rightStartOnLeft = left.start.vectorTo(right.start).dot(leftVector) / leftLengthSquared;
    const rightEndOnLeft = left.start.vectorTo(right.end).dot(leftVector) / leftLengthSquared;
    const overlapStartOnLeft = Math.max(Math.min(rightStartOnLeft, rightEndOnLeft), 0);
    const overlapEndOnLeft = Math.min(Math.max(rightStartOnLeft, rightEndOnLeft), 1);

    if (overlapStartOnLeft > overlapEndOnLeft + DEFAULT_TOLERANCE.parameter) {
        return GeometryResult.empty();
    }

    const clampedStartOnLeft = clampUnitParameter(overlapStartOnLeft);
    const clampedEndOnLeft = clampUnitParameter(overlapEndOnLeft);
    const overlapStart = left.pointAt(clampedStartOnLeft);
    const overlapEnd = left.pointAt(clampedEndOnLeft);
    const startOnRight = clampUnitParameter(
        right.start.vectorTo(overlapStart).dot(rightVector) / rightLengthSquared,
    );
    const endOnRight = clampUnitParameter(
        right.start.vectorTo(overlapEnd).dot(rightVector) / rightLengthSquared,
    );

    if (DEFAULT_TOLERANCE.arePointsNear2(overlapStart, overlapEnd)) {
        return GeometryResult.success({
            kind: 'point',
            leftParameters: [clampedStartOnLeft, clampedStartOnLeft],
            point: overlapStart,
            rightParameters: [startOnRight, startOnRight],
        });
    }

    return GeometryResult.success({
        kind: 'overlap',
        leftParameters: [clampedStartOnLeft, clampedEndOnLeft],
        overlap: new LineSegment2(overlapStart, overlapEnd),
        rightParameters: [startOnRight, endOnRight],
    });
}

function collinearSegmentsOverlap(qMinusP: Vec2, r: Vec2, s: Vec2): boolean {
    const rLengthSquared = r.lengthSquared();
    const t0 = qMinusP.dot(r) / rLengthSquared;
    const t1 = t0 + s.dot(r) / rLengthSquared;
    const overlapMin = Math.max(Math.min(t0, t1), 0);
    const overlapMax = Math.min(Math.max(t0, t1), 1);

    return overlapMin <= overlapMax + DEFAULT_TOLERANCE.parameter;
}
