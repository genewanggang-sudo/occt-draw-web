import { Vec2, type Vector2 } from '../linear/vec2';
import { MATH_EPSILON } from '../value/tolerance';
import { ParameterDomain } from './parameter';
import type { BoundedCurve2 } from './curve';

export class LineSegment2 implements BoundedCurve2 {
    public readonly domain = ParameterDomain.unit();
    public readonly end: Vec2;
    public readonly start: Vec2;

    constructor(start: Vector2, end: Vector2) {
        this.start = Vec2.from(start);
        this.end = Vec2.from(end);
    }

    public length(): number {
        return this.start.distanceTo(this.end);
    }

    public pointAt(parameter: number): Vec2 {
        return this.start.translated(
            this.start.vectorTo(this.end).scale(this.domain.clamp(parameter)),
        );
    }

    public tangentAt(): Vec2 {
        return this.start.vectorTo(this.end).normalize();
    }

    public isValid(): boolean {
        return (
            this.start.isFinite() &&
            this.end.isFinite() &&
            this.start.distanceTo(this.end) > MATH_EPSILON
        );
    }
}
