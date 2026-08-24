import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import type { Vec2, Vector2 } from '../linear/vec2';
import type { Vec3, Vector3 } from '../linear/vec3';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { PointSegmentDistance2Calculator } from './pointSegmentDistance2Calculator';
import { PointSegmentDistance3Calculator } from './pointSegmentDistance3Calculator';

export { DistanceResult } from './distanceResult';
import type { DistanceResult } from './distanceResult';

export type ClosestPointResult<TPoint> = DistanceResult<TPoint>;

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Public static service API.
export class Distance {
    public static pointToSegment2(point: Vector2, segment: LineSegment2): DistanceResult<Vec2> {
        return new PointSegmentDistance2Calculator(DEFAULT_TOLERANCE).calculate(point, segment);
    }

    public static pointToSegment3(point: Vector3, segment: LineSegment3): DistanceResult<Vec3> {
        return new PointSegmentDistance3Calculator(DEFAULT_TOLERANCE).calculate(point, segment);
    }
}
