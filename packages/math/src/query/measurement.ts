import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import type { BBox3 } from '../geometry-3d/bbox3';
import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';

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
        return { value: signedPolygonArea2(points) };
    },

    polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return { value: Math.abs(signedPolygonArea2(points)) };
    },

    polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        const signedArea = signedPolygonArea2(points);

        if (
            points.length < 3 ||
            !points.every(isFinitePoint2) ||
            DEFAULT_TOLERANCE.isNearZeroSquared(signedArea * signedArea)
        ) {
            return GeometryResult.degenerate();
        }

        let x = 0;
        let y = 0;

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

            const cross = previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
            x += (previousPoint.x + currentPoint.x) * cross;
            y += (previousPoint.y + currentPoint.y) * cross;
        }

        return GeometryResult.success(Vec2.of(x / (6 * signedArea), y / (6 * signedArea)));
    },

    boundsDiameter3(bounds: BBox3): MeasurementResult {
        return { value: bounds.diagonalLength() };
    },
} as const;

function signedPolygonArea2(points: readonly Vector2[]): number {
    let area = 0;

    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
        const currentPoint = points[index];
        const previousPoint = points[previous];

        if (!currentPoint || !previousPoint) {
            continue;
        }

        area += previousPoint.x * currentPoint.y - currentPoint.x * previousPoint.y;
    }

    return area / 2;
}

function isFinitePoint2(point: Vector2): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.y);
}
