import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import { Polygon2 } from '../geometry-2d/polygon2';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import type { BBox3 } from '../geometry-3d/bbox3';
import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';
import type { GeometryResult } from '../value/result';

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
        return { value: new Polygon2(points).signedArea() };
    },

    polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return { value: new Polygon2(points).area() };
    },

    polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        return new Polygon2(points).centroid();
    },

    boundsDiameter3(bounds: BBox3): MeasurementResult {
        return { value: bounds.diagonalLength() };
    },
} as const;
