import type { BBox2 } from '../geometry-2d/bbox2';
import type { Vector2 } from '../linear/vec2';
import type { Tolerance } from '../value/tolerance';
import { ContainmentResult } from './containmentResult';

export class BoundsContainment2 {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public classify(bounds: BBox2, point: Vector2): ContainmentResult {
        if (!bounds.contains(point)) {
            return ContainmentResult.outside();
        }

        return this.tolerance.equals(point.x, bounds.min.x) ||
            this.tolerance.equals(point.x, bounds.max.x) ||
            this.tolerance.equals(point.y, bounds.min.y) ||
            this.tolerance.equals(point.y, bounds.max.y)
            ? ContainmentResult.onBoundary()
            : ContainmentResult.inside();
    }
}
