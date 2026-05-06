import type { Curve2 } from '../geometry-2d/curve';
import { Polyline2 } from '../geometry-2d/polyline2';
import { CurveSampler } from './curveSampler';

export const PolylineApproximation = {
    fromCurve2(curve: Curve2, samples: number): Polyline2 {
        return new Polyline2(CurveSampler.sampleCurve2(curve, samples));
    },
} as const;
