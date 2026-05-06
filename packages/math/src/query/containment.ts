import type { BBox2 } from '../geometry-2d/bbox2';
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
        if (polygon.length < 3) {
            return containmentResult('outside');
        }

        let inside = false;

        for (
            let index = 0, previous = polygon.length - 1;
            index < polygon.length;
            previous = index++
        ) {
            const currentPoint = polygon[index];
            const previousPoint = polygon[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            if (isPointOnSegment(point, previousPoint, currentPoint)) {
                return containmentResult('on-boundary');
            }

            const crosses =
                currentPoint.y > point.y !== previousPoint.y > point.y &&
                point.x <
                    ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
                        (previousPoint.y - currentPoint.y) +
                        currentPoint.x;

            if (crosses) {
                inside = !inside;
            }
        }

        return containmentResult(inside ? 'inside' : 'outside');
    },
} as const;

type ContainmentStatus = 'inside' | 'on-boundary' | 'outside';

function containmentResult(status: ContainmentStatus): ContainmentResult {
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

function isPointOnSegment(point: Vector2, start: Vector2, end: Vector2): boolean {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (DEFAULT_TOLERANCE.isNearZeroSquared(lengthSquared)) {
        const pointDx = point.x - start.x;
        const pointDy = point.y - start.y;

        return DEFAULT_TOLERANCE.isNearZeroSquared(pointDx * pointDx + pointDy * pointDy);
    }

    const cross = (point.x - start.x) * dy - (point.y - start.y) * dx;

    if (cross * cross > DEFAULT_TOLERANCE.distanceSquared * lengthSquared) {
        return false;
    }

    const parameter = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;

    return (
        parameter >= -DEFAULT_TOLERANCE.parameter && parameter <= 1 + DEFAULT_TOLERANCE.parameter
    );
}
