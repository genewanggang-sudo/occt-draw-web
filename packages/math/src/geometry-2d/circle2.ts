import { Vec2, type Vector2 } from '../linear/vec2';
import { MATH_EPSILON } from '../value/tolerance';
import type { BoundedCurve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Circle2 implements BoundedCurve2 {
    public readonly center: Vec2;
    public readonly domain = new ParameterDomain(0, Math.PI * 2);
    public readonly radius: number;

    constructor(center: Vector2, radius: number) {
        this.center = Vec2.from(center);
        this.radius = radius;
    }

    public pointAt(angleRadians: number): Vec2 {
        return this.center.translated(
            Vec2.of(Math.cos(angleRadians) * this.radius, Math.sin(angleRadians) * this.radius),
        );
    }

    public tangentAt(angleRadians: number): Vec2 {
        return Vec2.of(-Math.sin(angleRadians), Math.cos(angleRadians)).normalize();
    }

    public isValid(): boolean {
        return this.center.isFinite() && Number.isFinite(this.radius) && this.radius > MATH_EPSILON;
    }
}
