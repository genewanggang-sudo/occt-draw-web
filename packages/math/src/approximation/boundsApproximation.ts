import { BBox2 } from '../geometry-2d/bbox2';
import type { Curve2 } from '../geometry-2d/curve';
import { CurveSampler } from './curveSampler';

export const BoundsApproximation = {
    curve2Bounds(curve: Curve2, samples: number): BBox2 {
        return BBox2.fromPoints(CurveSampler.sampleCurve2(curve, samples));
    },
} as const;
