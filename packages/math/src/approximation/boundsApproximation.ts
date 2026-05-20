import type { BBox2 } from '../geometry-2d/bbox2';
import type { Curve2 } from '../geometry-2d/curve';
import type { GeometryResult } from '../value/result';

export class BoundsApproximation {
    private static readonly defaultApproximator = new BoundsApproximation();

    public static curve2Bounds(curve: Curve2, samples: number): GeometryResult<BBox2> {
        return BoundsApproximation.defaultApproximator.curve2Bounds(curve, samples);
    }

    public curve2Bounds(curve: Curve2, samples: number): GeometryResult<BBox2> {
        return curve.bounds({ samples });
    }
}
