import type { LineSegment2 } from '../geometry-2d/lineSegment2';
import { Vec2ResultPayloadSnapshotter } from '../linear/vec2ResultPayloadSnapshotter';
import type { Vec2, Vector2 } from '../linear/vec2';
import { Scalar } from '../value/scalar';
import type { Tolerance } from '../value/tolerance';
import { DistanceResult } from './distanceResult';

export class PointSegmentDistance2Calculator {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public calculate(point: Vector2, segment: LineSegment2): DistanceResult<Vec2> {
        const vector = segment.start.vectorTo(segment.end);
        const lengthSquared = vector.dot(vector);
        const isDegenerate = this.tolerance.isNearZeroSquared(lengthSquared);
        const parameter = isDegenerate
            ? 0
            : Scalar.clamp(segment.start.vectorTo(point).dot(vector) / lengthSquared, 0, 1);
        const closestPoint = segment.pointAt(parameter);

        return DistanceResult.create(
            {
                closestPoint,
                distance: closestPoint.distanceTo(point),
                parameter,
                status: isDegenerate ? 'degenerate' : 'success',
            },
            new Vec2ResultPayloadSnapshotter(),
        );
    }
}
