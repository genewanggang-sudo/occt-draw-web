import type { Curve2 } from './curve';
import { LineSegment2 } from './lineSegment2';

export interface CurveSegmentSamplingOptions {
    readonly closed?: boolean;
    readonly segments?: number;
}

export function sampleCurveSegments2(
    curve: Curve2,
    options: CurveSegmentSamplingOptions = {},
): readonly LineSegment2[] {
    const segmentCount = Math.floor(options.segments ?? 32);

    if (segmentCount <= 0) {
        return [];
    }

    if (options.closed) {
        const points = curve.sample({ includeEnd: false, samples: segmentCount });

        return points.flatMap((start, index) => {
            const end = points[(index + 1) % points.length];

            return end ? [new LineSegment2(start, end)] : [];
        });
    }

    const points = curve.sample({ includeEnd: true, samples: segmentCount + 1 });

    return points.slice(0, -1).flatMap((start, index) => {
        const end = points[index + 1];

        return end ? [new LineSegment2(start, end)] : [];
    });
}
