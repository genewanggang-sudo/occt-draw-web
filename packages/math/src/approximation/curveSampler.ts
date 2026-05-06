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
        if (
            !curve.isValid() ||
            !Number.isFinite(curve.domain.min) ||
            !Number.isFinite(curve.domain.max)
        ) {
            return [];
        }

        const count = Math.floor(samples);

        if (count <= 0) {
            return [];
        }

        const includeEnd = options.includeEnd ?? true;

        return Array.from({ length: count }, (_, index) => {
            const progress = includeEnd ? index / Math.max(count - 1, 1) : index / count;
            const parameter = curve.domain.min + curve.domain.length * progress;

            return curve.pointAt(parameter);
        });
    },
} as const;
