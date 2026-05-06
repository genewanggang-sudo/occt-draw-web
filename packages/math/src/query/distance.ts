import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import type { Vec2, Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import { Scalar } from '../value/scalar';

export interface DistanceResult<TPoint> {
    readonly closestPoint: TPoint;
    readonly distance: number;
    readonly parameter: number;
}

export const Distance = {
    pointToSegment2(point: Vector2, segment: LineSegment2): DistanceResult<Vec2> {
        const vector = segment.start.vectorTo(segment.end);
        const lengthSquared = vector.dot(vector);
        const parameter =
            lengthSquared <= 1e-12
                ? 0
                : Scalar.clamp(segment.start.vectorTo(point).dot(vector) / lengthSquared, 0, 1);
        const closestPoint = segment.pointAt(parameter);

        return {
            closestPoint,
            distance: closestPoint.distanceTo(point),
            parameter,
        };
    },

    pointToSegment3(point: Vector3, segment: LineSegment3): DistanceResult<Vec3> {
        const vector = segment.start.vectorTo(segment.end);
        const lengthSquared = vector.dot(vector);
        const parameter =
            lengthSquared <= 1e-12
                ? 0
                : Scalar.clamp(segment.start.vectorTo(point).dot(vector) / lengthSquared, 0, 1);
        const closestPoint = segment.pointAt(parameter);

        return {
            closestPoint,
            distance: closestPoint.distanceTo(point),
            parameter,
        };
    },
} as const;

export type ClosestPointResult<TPoint> = DistanceResult<TPoint>;
