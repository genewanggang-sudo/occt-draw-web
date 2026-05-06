import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import type { BBox3 } from '../geometry-3d/bbox3';
import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';

export interface MeasurementResult {
    readonly value: number;
}

export const Measurement = {
    length2(segment: LineSegment2): MeasurementResult {
        return { value: segment.length() };
    },

    length3(segment: LineSegment3): MeasurementResult {
        return { value: segment.length() };
    },

    distance2(left: Vector2, right: Vector2): MeasurementResult {
        return { value: Vec2.distance(left, right) };
    },

    distance3(left: Vector3, right: Vector3): MeasurementResult {
        return { value: Vec3.distance(left, right) };
    },

    polygonSignedArea2(points: readonly Vector2[]): MeasurementResult {
        let area = 0;

        for (
            let index = 0, previous = points.length - 1;
            index < points.length;
            previous = index++
        ) {
            const currentPoint = points[index];
            const previousPoint = points[previous];

            if (!currentPoint || !previousPoint) {
                continue;
            }

            area += previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
        }

        return { value: area / 2 };
    },

    boundsDiameter3(bounds: BBox3): MeasurementResult {
        return { value: bounds.diagonalLength() };
    },
} as const;
