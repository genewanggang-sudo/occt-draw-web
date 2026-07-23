import { Vec2 } from '../linear/vec2';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { Curve2 } from './curve';
import { FitSpline2Interpolator } from './spline/fitSpline2Interpolator';
import type { ParameterDomain } from './parameterDomain';
import type { GeometryResultStatus } from '../value/result';
import type { BSpline2 } from './bspline2';
import type { FitSpline2Interpolation } from './spline/fitSpline2Interpolation';
import type { FitSpline2Input, FitSplineParameterization } from './spline/fitSpline2Specification';

export type { FitSpline2Input, FitSplineParameterization } from './spline/fitSpline2Specification';

export class FitSpline2 extends Curve2 {
    private readonly fitParameterSnapshot: readonly number[];
    private readonly fitPointSnapshot: readonly Vec2[];

    public readonly basisCurve: BSpline2;
    public readonly closed: boolean;
    public readonly degree: number;
    public readonly domain: ParameterDomain;
    public readonly endTangent: Vec2 | null;
    public readonly parameterization: FitSplineParameterization;
    public readonly startTangent: Vec2 | null;

    private constructor(interpolation: FitSpline2Interpolation) {
        super();
        const specification = interpolation.specification;

        this.basisCurve = interpolation.basisCurve;
        this.closed = specification.closed;
        this.degree = specification.degree;
        this.domain = interpolation.basisCurve.domain;
        this.endTangent = specification.endTangent ? Vec2.from(specification.endTangent) : null;
        this.fitParameterSnapshot = [...interpolation.parameterSet.values];
        this.fitPointSnapshot = specification.fitPoints.map((point) => Vec2.from(point));
        this.parameterization = specification.parameterization;
        this.startTangent = specification.startTangent
            ? Vec2.from(specification.startTangent)
            : null;
    }

    public get fitParameters(): readonly number[] {
        return [...this.fitParameterSnapshot];
    }

    public get fitPoints(): readonly Vec2[] {
        return this.fitPointSnapshot.map((point) => Vec2.from(point));
    }

    public pointAt(parameter: number): Vec2 {
        return this.basisCurve.pointAt(parameter);
    }

    public tangentAt(parameter: number): Vec2 {
        return this.basisCurve.tangentAt(parameter);
    }

    public isValid(): boolean {
        return this.basisCurve.isValid() && this.fitPointSnapshot.length >= 3;
    }

    public static fromFitPoints(input: FitSpline2Input): GeometryResult<FitSpline2> {
        const interpolation = new FitSpline2Interpolator(DEFAULT_TOLERANCE).interpolate(input);

        return interpolation.success && interpolation.value
            ? GeometryResult.success(
                  new FitSpline2(interpolation.value),
                  new ImmutableResultPayloadSnapshotter<FitSpline2>(),
              )
            : FitSpline2.failureFor(interpolation.status);
    }

    private static failureFor<TValue>(status: GeometryResultStatus): GeometryResult<TValue> {
        return status === 'empty' ? GeometryResult.empty() : GeometryResult.degenerate();
    }
}
