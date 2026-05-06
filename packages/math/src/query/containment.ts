import type { BBox2 } from '../geometry-2d/bbox2';
import type { BBox3 } from '../geometry-3d/bbox3';
import type { Vector2 } from '../linear/vec2';
import type { Vector3 } from '../linear/vec3';
import { Classification, type ClassificationResult } from './classification';

export interface ContainmentResult {
    readonly classification: ClassificationResult;
    readonly contains: boolean;
}

export const Containment = {
    bbox2ContainsPoint(bounds: BBox2, point: Vector2): ContainmentResult {
        return containmentResult(bounds.contains(point));
    },

    bbox3ContainsPoint(bounds: BBox3, point: Vector3): ContainmentResult {
        return containmentResult(bounds.contains(point));
    },

    pointInPolygon2(point: Vector2, polygon: readonly Vector2[]): ContainmentResult {
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

        return containmentResult(inside);
    },
} as const;

function containmentResult(contains: boolean): ContainmentResult {
    return {
        classification: Classification.fromContainment(contains),
        contains,
    };
}
