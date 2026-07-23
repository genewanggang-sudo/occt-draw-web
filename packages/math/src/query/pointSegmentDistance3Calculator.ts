import type { LineSegment3 } from '../geometry-3d/lineSegment3';
import { Vec3ResultPayloadSnapshotter } from '../linear/vec3ResultPayloadSnapshotter';
import type { Vec3, Vector3 } from '../linear/vec3';
import { Scalar } from '../value/scalar';
import type { Tolerance } from '../value/tolerance';
import { DistanceResult } from './distanceResult';

export class PointSegmentDistance3Calculator {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public calculate(point: Vector3, segment: LineSegment3): DistanceResult<Vec3> {
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
            new Vec3ResultPayloadSnapshotter(),
        );
    }
}
