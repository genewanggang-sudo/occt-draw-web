import { Vec2, type Vector2 } from '../linear/vec2';
import { ParameterDomain } from './parameter';
import type { Curve2 } from './curve';
import { MATH_EPSILON } from '../value/tolerance';

export class Line2 implements Curve2 {
    public readonly domain = new ParameterDomain(
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
    );
    public readonly direction: Vec2;
    public readonly origin: Vec2;

    constructor(origin: Vector2, direction: Vector2) {
        this.origin = Vec2.from(origin);
        this.direction = Vec2.from(direction).normalize();
    }

    public pointAt(parameter: number): Vec2 {
        return this.origin.translated(this.direction.scale(parameter));
    }

    public tangentAt(): Vec2 {
        return this.direction;
    }

    public isValid(): boolean {
        return (
            this.origin.isFinite() &&
            this.direction.isFinite() &&
            this.direction.length() > MATH_EPSILON
        );
    }
}
