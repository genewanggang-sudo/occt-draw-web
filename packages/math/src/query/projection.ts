import type { Plane3 } from '../geometry-3d/plane3';
import type { Ray3 } from '../geometry-3d/ray3';
import type { Vec2, Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import type { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { PointLineParameterProjector2 } from './pointLineParameterProjector2';
import { PointPlaneProjector3 } from './pointPlaneProjector3';
import { PointRayParameterProjector3 } from './pointRayParameterProjector3';

export type ProjectionResult<TValue> = GeometryResult<TValue>;

export class Projection {
    public static pointToLineParameter2(
        point: Vector2,
        start: Vector2,
        end: Vector2,
    ): ProjectionResult<number> {
        return new PointLineParameterProjector2(DEFAULT_TOLERANCE).project(point, start, end);
    }

    public static pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return new PointPlaneProjector3().project(point, plane);
    }

    public static pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return new PointPlaneProjector3().projectToLocal(point, plane);
    }

    public static pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return new PointRayParameterProjector3().project(point, ray);
    }

    public pointToLineParameter2(
        point: Vector2,
        start: Vector2,
        end: Vector2,
    ): ProjectionResult<number> {
        return Projection.pointToLineParameter2(point, start, end);
    }

    public pointToPlane3(point: Vector3, plane: Plane3): ProjectionResult<Vec3> {
        return Projection.pointToPlane3(point, plane);
    }

    public pointToPlaneLocal2(point: Vector3, plane: Plane3): ProjectionResult<Vec2> {
        return Projection.pointToPlaneLocal2(point, plane);
    }

    public pointToRayParameter3(point: Vector3, ray: Ray3): ProjectionResult<number> {
        return Projection.pointToRayParameter3(point, ray);
    }
}
