import type { Plane3 } from '../geometry-3d/plane3';
import type { Vec2 } from '../linear/vec2';
import { Vec2ResultPayloadSnapshotter } from '../linear/vec2ResultPayloadSnapshotter';
import type { Vec3, Vector3 } from '../linear/vec3';
import { Vec3ResultPayloadSnapshotter } from '../linear/vec3ResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';

export class PointPlaneProjector3 {
    public project(point: Vector3, plane: Plane3): GeometryResult<Vec3> {
        return GeometryResult.success(
            plane.projectPoint(point),
            new Vec3ResultPayloadSnapshotter(),
        );
    }

    public projectToLocal(point: Vector3, plane: Plane3): GeometryResult<Vec2> {
        return GeometryResult.success(
            plane.projectPointToLocal(point),
            new Vec2ResultPayloadSnapshotter(),
        );
    }
}
