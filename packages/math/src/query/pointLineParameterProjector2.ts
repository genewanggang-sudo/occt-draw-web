import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import type { Tolerance } from '../value/tolerance';

export class PointLineParameterProjector2 {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public project(point: Vector2, start: Vector2, end: Vector2): GeometryResult<number> {
        const vector = Vec2.subtract(end, start);
        const lengthSquared = vector.dot(vector);

        return this.tolerance.isNearZeroSquared(lengthSquared)
            ? GeometryResult.degenerate()
            : GeometryResult.success(Vec2.dot(Vec2.subtract(point, start), vector) / lengthSquared);
    }
}
