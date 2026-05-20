import type { Plane3 } from '../geometry-3d/plane3';
import type { Ray3 } from '../geometry-3d/ray3';
import { Vec2, type Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export type ProjectionResult<TValue> = GeometryResult<TValue>;

export class Projection {
    private static readonly defaultProjection = new Projection();

    public static pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return Projection.defaultProjection.pointToPlane3(point, plane);
    }

    public static pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return Projection.defaultProjection.pointToPlaneLocal2(point, plane);
    }

    public static pointToLineParameter2(
        point: Vector2,
        start: Vector2,
        end: Vector2,
    ): ProjectionResult<number> {
        return Projection.defaultProjection.pointToLineParameter2(point, start, end);
    }

    public static pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return Projection.defaultProjection.pointToRayParameter3(point, ray);
    }

    public pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return GeometryResult.success(plane.projectPoint(point));
    }

    public pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return GeometryResult.success(plane.projectPointToLocal(point));
    }

    public pointToLineParameter2(
        point: Vector2,
        start: Vector2,
        end: Vector2,
    ): ProjectionResult<number> {
        const vector = Vec2.subtract(end, start);
        const lengthSquared = vector.dot(vector);

        return DEFAULT_TOLERANCE.isNearZeroSquared(lengthSquared)
            ? GeometryResult.degenerate()
            : GeometryResult.success(Vec2.dot(Vec2.subtract(point, start), vector) / lengthSquared);
    }

    public pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return ray.isValid()
            ? GeometryResult.success(ray.origin.vectorTo(point).dot(ray.direction))
            : GeometryResult.degenerate();
    }
}
