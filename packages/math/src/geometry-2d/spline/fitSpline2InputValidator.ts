import { Vec2, type Vector2 } from '../../linear/vec2';
import { ImmutableResultPayloadSnapshotter } from '../../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../../value/result';
import { FitSpline2Specification, type FitSpline2Input } from './fitSpline2Specification';
import type { Tolerance } from '../../value/tolerance';

export class FitSpline2InputValidator {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public validate(input: FitSpline2Input): GeometryResult<FitSpline2Specification> {
        const fitPoints = input.fitPoints.map((point) => Vec2.from(point));

        if (fitPoints.length < 3) {
            return GeometryResult.empty();
        }

        if (
            !fitPoints.every((point) => point.isFinite()) ||
            !this.isOptionalFiniteVector(input.startTangent) ||
            !this.isOptionalFiniteVector(input.endTangent)
        ) {
            return GeometryResult.empty();
        }

        if (!this.hasUsablePointSpan(fitPoints)) {
            return GeometryResult.degenerate();
        }

        return GeometryResult.success(
            new FitSpline2Specification({
                closed: input.closed ?? false,
                degree: input.degree,
                endTangent: input.endTangent ? Vec2.from(input.endTangent) : null,
                fitPoints,
                parameterization: input.parameterization,
                startTangent: input.startTangent ? Vec2.from(input.startTangent) : null,
            }),
            new ImmutableResultPayloadSnapshotter<FitSpline2Specification>(),
        );
    }

    private hasUsablePointSpan(points: readonly Vec2[]): boolean {
        const firstPoint = points[0];

        return (
            firstPoint !== undefined &&
            points.some(
                (point, index) =>
                    index > 0 && point.distanceTo(firstPoint) > this.tolerance.distance,
            )
        );
    }

    private isOptionalFiniteVector(vector: Vector2 | undefined): boolean {
        return !vector || (Number.isFinite(vector.x) && Number.isFinite(vector.y));
    }
}
