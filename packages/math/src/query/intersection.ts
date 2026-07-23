import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { Triangle3 } from '../geometry-3d/triangle3';
import type { Ray3 } from '../geometry-3d/ray3';
import type { Vec2 } from '../linear/vec2';
import type { Vec3 } from '../linear/vec3';
import type { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { RayTriangle3Intersector } from './rayTriangle3Intersector';
import { SegmentSegment2Intersector } from './segmentSegment2Intersector';
import type { SegmentSegment2Intersection } from './segmentSegment2Intersection';

export type IntersectionResult<TValue> = GeometryResult<TValue>;

export type { SegmentSegment2Intersection } from './segmentSegment2Intersection';
export { SegmentSegment2OverlapIntersection } from './segmentSegment2OverlapIntersection';
export { SegmentSegment2PointIntersection } from './segmentSegment2PointIntersection';

export class Intersection {
    public static rayTriangle3(ray: Ray3, triangle: Triangle3): IntersectionResult<Vec3> {
        return new RayTriangle3Intersector(DEFAULT_TOLERANCE).intersect(ray, triangle);
    }

    public static segmentSegment2Detailed(
        left: LineSegment2,
        right: LineSegment2,
    ): IntersectionResult<SegmentSegment2Intersection> {
        return new SegmentSegment2Intersector(DEFAULT_TOLERANCE).intersectDetailed(left, right);
    }

    public static segments2(left: LineSegment2, right: LineSegment2): IntersectionResult<Vec2> {
        return new SegmentSegment2Intersector(DEFAULT_TOLERANCE).intersect(left, right);
    }

    public rayTriangle3(ray: Ray3, triangle: Triangle3): IntersectionResult<Vec3> {
        return Intersection.rayTriangle3(ray, triangle);
    }

    public segmentSegment2Detailed(
        left: LineSegment2,
        right: LineSegment2,
    ): IntersectionResult<SegmentSegment2Intersection> {
        return Intersection.segmentSegment2Detailed(left, right);
    }

    public segments2(left: LineSegment2, right: LineSegment2): IntersectionResult<Vec2> {
        return Intersection.segments2(left, right);
    }
}
