import type { Curve2 } from '../geometry-2d/curve';
import type { Vec2 } from '../linear/vec2';

export interface CurveSamplingOptions {
    readonly includeEnd?: boolean;
}

export const CurveSampler = {
    sampleCurve2(
        curve: Curve2,
        samples: number,
        options: CurveSamplingOptions = {},
    ): readonly Vec2[] {
        if (!curve.isValid()) {
            return [];
        }

        const count = Math.max(2, Math.floor(samples));
        const includeEnd = options.includeEnd ?? true;

        return Array.from({ length: count }, (_, index) => {
            const progress = includeEnd ? index / Math.max(count - 1, 1) : index / count;
            const parameter =
                Number.isFinite(curve.domain.min) && Number.isFinite(curve.domain.max)
                    ? curve.domain.min + curve.domain.length * progress
                    : progress;

            return curve.pointAt(parameter);
        });
    },
} as const;
