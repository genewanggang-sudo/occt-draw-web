import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import { Polygon2 } from '../geometry-2d/polygon2';
import type { BBox3 } from '../geometry-3d/bbox3';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';
import type { GeometryResult } from '../value/result';
import { MeasurementResult } from './measurementResult';

export { MeasurementResult } from './measurementResult';

export class Measurement {
    public static boundsDiameter3(bounds: BBox3): MeasurementResult {
        return new MeasurementResult(bounds.diagonalLength());
    }

    public static distance2(left: Vector2, right: Vector2): MeasurementResult {
        return new MeasurementResult(Vec2.distance(left, right));
    }

    public static distance3(left: Vector3, right: Vector3): MeasurementResult {
        return new MeasurementResult(Vec3.distance(left, right));
    }

    public static length2(segment: LineSegment2): MeasurementResult {
        return new MeasurementResult(segment.length());
    }

    public static length3(segment: LineSegment3): MeasurementResult {
        return new MeasurementResult(segment.length());
    }

    public static polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return new MeasurementResult(new Polygon2(points).area());
    }

    public static polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        return new Polygon2(points).centroid();
    }

    public static polygonSignedArea2(points: readonly Vector2[]): MeasurementResult {
        return new MeasurementResult(new Polygon2(points).signedArea());
    }

    public boundsDiameter3(bounds: BBox3): MeasurementResult {
        return Measurement.boundsDiameter3(bounds);
    }

    public distance2(left: Vector2, right: Vector2): MeasurementResult {
        return Measurement.distance2(left, right);
    }

    public distance3(left: Vector3, right: Vector3): MeasurementResult {
        return Measurement.distance3(left, right);
    }

    public length2(segment: LineSegment2): MeasurementResult {
        return Measurement.length2(segment);
    }

    public length3(segment: LineSegment3): MeasurementResult {
        return Measurement.length3(segment);
    }

    public polygonArea2(points: readonly Vector2[]): MeasurementResult {
        return Measurement.polygonArea2(points);
    }

    public polygonCentroid2(points: readonly Vector2[]): GeometryResult<Vec2> {
        return Measurement.polygonCentroid2(points);
    }

    public polygonSignedArea2(points: readonly Vector2[]): MeasurementResult {
        return Measurement.polygonSignedArea2(points);
    }
}
