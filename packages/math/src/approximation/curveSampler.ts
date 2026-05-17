import type { Curve2, CurveSamplingOptions } from '../geometry-2d/curve';
import type { Vec2 } from '../linear/vec2';

export type { CurveSamplingOptions };

export const CurveSampler = {
    sampleCurve2(
        curve: Curve2,
        samples: number,
        options: CurveSamplingOptions = {},
    ): readonly Vec2[] {
        return curve.sample({ ...options, samples });
    },
} as const;
