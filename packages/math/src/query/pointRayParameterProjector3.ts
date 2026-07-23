import type { Ray3 } from '../geometry-3d/ray3';
import type { Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';

export class PointRayParameterProjector3 {
    public project(point: Vector3, ray: Ray3): GeometryResult<number> {
        return ray.isValid()
            ? GeometryResult.success(ray.origin.vectorTo(point).dot(ray.direction))
            : GeometryResult.degenerate();
    }
}
