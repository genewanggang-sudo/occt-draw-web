import type { Triangle3 } from '../geometry-3d/triangle3';
import type { Ray3 } from '../geometry-3d/ray3';
import { Vec3 } from '../linear/vec3';
import { Vec3ResultPayloadSnapshotter } from '../linear/vec3ResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import type { Tolerance } from '../value/tolerance';

export class RayTriangle3Intersector {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public intersect(ray: Ray3, triangle: Triangle3): GeometryResult<Vec3> {
        if (!ray.isValid()) {
            return GeometryResult.degenerate();
        }

        const edge1 = Vec3.subtract(triangle.b, triangle.a);
        const edge2 = Vec3.subtract(triangle.c, triangle.a);
        const normal = edge1.cross(edge2);

        if (this.tolerance.isNearZeroSquared(normal.lengthSquared())) {
            return GeometryResult.degenerate();
        }

        const h = ray.direction.cross(edge2);
        const determinant = edge1.dot(h);

        if (this.tolerance.isNearZero(determinant)) {
            return GeometryResult.parallel();
        }

        const inverseDeterminant = 1 / determinant;
        const s = Vec3.subtract(ray.origin, triangle.a);
        const u = inverseDeterminant * s.dot(h);

        if (!this.isUnitParameter(u)) {
            return GeometryResult.empty();
        }

        const q = s.cross(edge1);
        const v = inverseDeterminant * ray.direction.dot(q);

        if (!this.isUnitParameter(v) || u + v > 1 + this.tolerance.parameter) {
            return GeometryResult.empty();
        }

        const distance = inverseDeterminant * edge2.dot(q);

        return distance < -this.tolerance.distance
            ? GeometryResult.empty()
            : GeometryResult.success(
                  ray.pointAt(Math.max(distance, 0)),
                  new Vec3ResultPayloadSnapshotter(),
              );
    }

    private isUnitParameter(value: number): boolean {
        return value >= -this.tolerance.parameter && value <= 1 + this.tolerance.parameter;
    }
}
