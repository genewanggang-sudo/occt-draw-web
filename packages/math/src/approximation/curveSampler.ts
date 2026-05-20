import type { Curve2, CurveSamplingOptions } from '../geometry-2d/curve';
import type { Vec2 } from '../linear/vec2';

export type { CurveSamplingOptions };

export class CurveSampler {
    private static readonly defaultSampler = new CurveSampler();

    public static sampleCurve2(
        curve: Curve2,
        samples: number,
        options: CurveSamplingOptions = {},
    ): readonly Vec2[] {
        return CurveSampler.defaultSampler.sampleCurve2(curve, samples, options);
    }

    public sampleCurve2(
        curve: Curve2,
        samples: number,
        options: CurveSamplingOptions = {},
    ): readonly Vec2[] {
        return curve.sample({ ...options, samples });
    }
}
