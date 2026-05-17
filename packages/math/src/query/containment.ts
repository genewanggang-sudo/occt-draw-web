import type { BBox2 } from '../geometry-2d/bbox2';
import { Polygon2, type PolygonPointClassification } from '../geometry-2d/polygon2';
import type { BBox3 } from '../geometry-3d/bbox3';
import type { Vector2 } from '../linear/vec2';
import type { Vector3 } from '../linear/vec3';
import { Classification, type ClassificationResult } from './classification';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

export interface ContainmentResult {
    readonly classification: ClassificationResult;
    readonly contains: boolean;
}

export const Containment = {
    bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
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
    },

    bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
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
    },

    pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
        return containmentResult(new Polygon2(polygon).classifyPoint(point));
    },
} as const;

function containmentResult(status: PolygonPointClassification): ContainmentResult {
    return {
        classification:
            status === 'inside'
                ? Classification.inside()
                : status === 'on-boundary'
                  ? Classification.onBoundary()
                  : Classification.outside(),
        contains: status !== 'outside',
    };
}
