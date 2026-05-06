import type { Plane3 } from '../geometry-3d/plane3';
import type { Ray3 } from '../geometry-3d/ray3';
import { Vec2, type Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';

export interface ProjectionResult<TValue> {
    readonly value: TValue;
}

export const Projection = {
    pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return { value: plane.projectPoint(point) };
    },

    pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return { value: plane.projectPointToLocal(point) };
    },

    pointToLineParameter2(point: Vector2, start: Vector2, end: Vector2): ProjectionResult<number> {
        const vector = Vec2.from(start).vectorTo(end);
        const lengthSquared = vector.dot(vector);
        const value =
            lengthSquared <= 1e-12
                ? 0
                : Vec2.from(start).vectorTo(point).dot(vector) / lengthSquared;

        return { value };
    },

    pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return { value: ray.origin.vectorTo(point).dot(ray.direction) };
    },
} as const;
