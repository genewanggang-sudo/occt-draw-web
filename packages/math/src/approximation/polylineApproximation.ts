import type { Curve2 } from '../geometry-2d/curve';
import { Polyline2 } from '../geometry-2d/polyline2';
import { GeometryResult } from '../value/result';
import { CurveSampler } from './curveSampler';

export const PolylineApproximation = {
    fromCurve2(curve: Curve2, samples: number): GeometryResult<Polyline2> {
        const points = CurveSampler.sampleCurve2(curve, samples);
        const polyline = new Polyline2(points);

        return polyline.isValid() ? GeometryResult.success(polyline) : GeometryResult.empty();
    },
} as const;
