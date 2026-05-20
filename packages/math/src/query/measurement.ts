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

export class Measurement {
    private static readonly defaultMeasurement = new Measurement();

    public static length2(segment: LineSegment2): MeasurementResult {
        return Measurement.defaultMeasurement.length2(segment);
    }

    public static length3(segment: LineSegment3): MeasurementResult {
        return Measurement.defaultMeasurement.length3(segment);
    }

    public static distance2(left: Vector2, right: Vector2): MeasurementResult {
        return Measurement.defaultMeasurement.distance2(left, right);
    }

    public static distance3(left: Vector3, right: Vector3): MeasurementResult {
        return Measurement.defaultMeasurement.distance3(left, right);
    }

    public static polygonSignedArea2(points: readonly Vector2[]): MeasurementResult {
        return Measurement.defaultMeasurement.polygonSignedArea2(points);
    }

    public static polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return Measurement.defaultMeasurement.polygonArea2(points);
    }

    public static polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        return Measurement.defaultMeasurement.polygonCentroid2(points);
    }

    public static boundsDiameter3(bounds: BBox3): MeasurementResult {
        return Measurement.defaultMeasurement.boundsDiameter3(bounds);
    }

    public length2(segment: LineSegment2): MeasurementResult {
        return { value: segment.length() };
    }

    public length3(segment: LineSegment3): MeasurementResult {
        return { value: segment.length() };
    }

    public distance2(left: Vector2, right: Vector2): MeasurementResult {
        return { value: Vec2.distance(left, right) };
    }

    public distance3(left: Vector3, right: Vector3): MeasurementResult {
        return { value: Vec3.distance(left, right) };
    }

    public polygonSignedArea2(points: readonly Vector2[]): MeasurementResult {
        return { value: new Polygon2(points).signedArea() };
    }

    public polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return { value: new Polygon2(points).area() };
    }

    public polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        return new Polygon2(points).centroid();
    }

    public boundsDiameter3(bounds: BBox3): MeasurementResult {
        return { value: bounds.diagonalLength() };
    }
}
