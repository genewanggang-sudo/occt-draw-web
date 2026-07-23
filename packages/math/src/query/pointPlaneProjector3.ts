import type { Plane3 } from '../geometry-3d/plane3';
import type { Vec2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';

export class PointPlaneProjector3 {
    public project(point: Vector3, plane: Plane3): GeometryResult<Vec3> {
        return GeometryResult.success(plane.projectPoint(point));
    }

    public projectToLocal(point: Vector3, plane: Plane3): GeometryResult<Vec2> {
        return GeometryResult.success(plane.projectPointToLocal(point));
    }
}
