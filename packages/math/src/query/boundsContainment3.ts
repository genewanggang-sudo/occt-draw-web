import type { BBox3 } from '../geometry-3d/bbox3';
import type { Vector3 } from '../linear/vec3';
import type { Tolerance } from '../value/tolerance';
import { ContainmentResult } from './containmentResult';

export class BoundsContainment3 {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public classify(bounds: BBox3, point: Vector3): ContainmentResult {
        if (!bounds.contains(point)) {
            return ContainmentResult.outside();
        }

        return this.tolerance.equals(point.x, bounds.min.x) ||
            this.tolerance.equals(point.x, bounds.max.x) ||
            this.tolerance.equals(point.y, bounds.min.y) ||
            this.tolerance.equals(point.y, bounds.max.y) ||
            this.tolerance.equals(point.z, bounds.min.z) ||
            this.tolerance.equals(point.z, bounds.max.z)
            ? ContainmentResult.onBoundary()
            : ContainmentResult.inside();
    }
}
