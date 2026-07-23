import type { BBox2 } from '../geometry-2d/bbox2';
import type { BBox3 } from '../geometry-3d/bbox3';
import type { Vector2 } from '../linear/vec2';
import type { Vector3 } from '../linear/vec3';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BoundsContainment2 } from './boundsContainment2';
import { BoundsContainment3 } from './boundsContainment3';
import { PolygonContainment2 } from './polygonContainment2';

export { ContainmentResult } from './containmentResult';
import type { ContainmentResult } from './containmentResult';

export class Containment {
    public static bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
        return new BoundsContainment2(DEFAULT_TOLERANCE).classify(bounds, point);
    }

    public static bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
        return new BoundsContainment3(DEFAULT_TOLERANCE).classify(bounds, point);
    }

    public static pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return new PolygonContainment2().classify(point, polygon);
    }

    public bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
        return Containment.bbox2ContainsPoint(bounds, point);
    }

    public bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
        return Containment.bbox3ContainsPoint(bounds, point);
    }

    public pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return Containment.pointInPolygon2(point, polygon);
    }
}
