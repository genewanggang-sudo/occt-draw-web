import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { Ray3 } from '../geometry-3d/ray3';
import type { Triangle3 } from '../geometry-3d/triangle3';
import type { Vec2 } from '../linear/vec2';
import { Vec3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';

export type IntersectionResult<TValue> = GeometryResult<TValue>;

export const Intersection = {
    segments2(left: LineSegment2, right: LineSegment2): IntersectionResult<Vec2> {
        const p = left.start;
        const r = left.start.vectorTo(left.end);
        const q = right.start;
        const s = right.start.vectorTo(right.end);
        const denominator = r.cross(s);

        if (Math.abs(denominator) <= MATH_EPSILON) {
            return Math.abs(q.vectorTo(p).cross(r)) <= MATH_EPSILON
                ? GeometryResult.coincident()
                : GeometryResult.parallel();
        }

        const t = q.vectorTo(p).cross(s) / denominator;
        const u = q.vectorTo(p).cross(r) / denominator;

        if (t < 0 || t > 1 || u < 0 || u > 1) {
            return GeometryResult.empty();
        }

        return GeometryResult.success(left.pointAt(t));
    },

    rayTriangle3(ray: Ray3, triangle: Triangle3): IntersectionResult<Vec3> {
        const edge1 = Vec3.subtract(triangle.b, triangle.a);
        const edge2 = Vec3.subtract(triangle.c, triangle.a);
        const h = ray.direction.cross(edge2);
        const determinant = edge1.dot(h);

        if (Math.abs(determinant) <= MATH_EPSILON) {
            return GeometryResult.parallel();
        }

        const inverseDeterminant = 1 / determinant;
        const s = Vec3.subtract(ray.origin, triangle.a);
        const u = inverseDeterminant * s.dot(h);

        if (u < 0 || u > 1) {
            return GeometryResult.empty();
        }

        const q = s.cross(edge1);
        const v = inverseDeterminant * ray.direction.dot(q);

        if (v < 0 || u + v > 1) {
            return GeometryResult.empty();
        }

        const distance = inverseDeterminant * edge2.dot(q);

        return distance < 0
            ? GeometryResult.empty()
            : GeometryResult.success(ray.pointAt(distance));
    },
} as const;
