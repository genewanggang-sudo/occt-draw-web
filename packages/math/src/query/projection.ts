import type { Plane3 } from '../geometry-3d/plane3';
import type { Ray3 } from '../geometry-3d/ray3';
import { Vec2, type Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export type ProjectionResult<TValue> = GeometryResult<TValue>;

export const Projection = {
    pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return GeometryResult.success(plane.projectPoint(point));
    },

    pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return GeometryResult.success(plane.projectPointToLocal(point));
    },

    pointToLineParameter2(point: Vector2, start: Vector2, end: Vector2): ProjectionResult<number> {
        const vector = Vec2.from(start).vectorTo(end);
        const lengthSquared = vector.dot(vector);

        return DEFAULT_TOLERANCE.isNearZeroSquared(lengthSquared)
            ? GeometryResult.degenerate()
            : GeometryResult.success(Vec2.from(start).vectorTo(point).dot(vector) / lengthSquared);
    },

    pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return ray.isValid()
            ? GeometryResult.success(ray.origin.vectorTo(point).dot(ray.direction))
            : GeometryResult.degenerate();
    },
} as const;
