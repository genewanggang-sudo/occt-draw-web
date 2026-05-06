import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { Ray3 } from '../geometry-3d/ray3';
import type { Triangle3 } from '../geometry-3d/triangle3';
import type { Vec2 } from '../linear/vec2';
import { Vec3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export type IntersectionResult<TValue> = GeometryResult<TValue>;

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

function collinearSegmentsOverlap(qMinusP: Vec2, r: Vec2, s: Vec2): boolean {
    const rLengthSquared = r.lengthSquared();
    const t0 = qMinusP.dot(r) / rLengthSquared;
    const t1 = t0 + s.dot(r) / rLengthSquared;
    const overlapMin = Math.max(Math.min(t0, t1), 0);
    const overlapMax = Math.min(Math.max(t0, t1), 1);

    return overlapMin <= overlapMax + DEFAULT_TOLERANCE.parameter;
}
