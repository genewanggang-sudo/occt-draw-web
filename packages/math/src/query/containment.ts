import type { BBox2 } from '../geometry-2d/bbox2';
import { Polygon2, type PolygonPointClassification } from '../geometry-2d/polygon2';
import type { BBox3 } from '../geometry-3d/bbox3';
import type { Vector2 } from '../linear/vec2';
import type { Vector3 } from '../linear/vec3';
import { ClassificationStatus } from './classification';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export interface ContainmentResult {
    readonly contains: boolean;
    readonly status: ClassificationStatus;
}

export class Containment {
    private static readonly defaultContainment = new Containment();

    public static bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
        return Containment.defaultContainment.bbox2ContainsPoint(bounds, point);
    }

    public static bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
        return Containment.defaultContainment.bbox3ContainsPoint(bounds, point);
    }

    public static pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return Containment.defaultContainment.pointInPolygon2(point, polygon);
    }

    public bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
        if (!bounds.contains(point)) {
            return containmentResult('outside');
        }

        return containmentResult(
            DEFAULT_TOLERANCE.equals(point.x, bounds.min.x) ||
                DEFAULT_TOLERANCE.equals(point.x, bounds.max.x) ||
                DEFAULT_TOLERANCE.equals(point.y, bounds.min.y) ||
                DEFAULT_TOLERANCE.equals(point.y, bounds.max.y)
                ? 'on-boundary'
                : 'inside',
        );
    }

    public bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
        if (!bounds.contains(point)) {
            return containmentResult('outside');
        }

        return containmentResult(
            DEFAULT_TOLERANCE.equals(point.x, bounds.min.x) ||
                DEFAULT_TOLERANCE.equals(point.x, bounds.max.x) ||
                DEFAULT_TOLERANCE.equals(point.y, bounds.min.y) ||
                DEFAULT_TOLERANCE.equals(point.y, bounds.max.y) ||
                DEFAULT_TOLERANCE.equals(point.z, bounds.min.z) ||
                DEFAULT_TOLERANCE.equals(point.z, bounds.max.z)
                ? 'on-boundary'
                : 'inside',
        );
    }

    public pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return containmentResult(new Polygon2(polygon).classifyPoint(point));
    }
}

function containmentResult(status: PolygonPointClassification): ContainmentResult {
    const classificationStatus =
        status === 'inside'
            ? ClassificationStatus.Inside
            : status === 'on-boundary'
              ? ClassificationStatus.OnBoundary
              : ClassificationStatus.Outside;

    return {
        contains: status !== 'outside',
        status: classificationStatus,
    };
}
