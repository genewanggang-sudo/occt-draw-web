import type { Curve2 } from '../geometry-2d/curve';
import { Polyline2 } from '../geometry-2d/polyline2';
import { GeometryResult } from '../value/result';
import { CurveSampler } from './curveSampler';

export class PolylineApproximation {
    private static readonly defaultApproximator = new PolylineApproximation();

    private readonly curveSampler: CurveSampler;

    constructor(curveSampler: CurveSampler = new CurveSampler()) {
        this.curveSampler = curveSampler;
    }

    public static fromCurve2(curve: Curve2, samples: number): GeometryResult<Polyline2> {
        return PolylineApproximation.defaultApproximator.fromCurve2(curve, samples);
    }

    public fromCurve2(curve: Curve2, samples: number): GeometryResult<Polyline2> {
        const points = this.curveSampler.sampleCurve2(curve, samples);
        const polyline = new Polyline2(points);

        return polyline.isValid() ? GeometryResult.success(polyline) : GeometryResult.empty();
    }
}
