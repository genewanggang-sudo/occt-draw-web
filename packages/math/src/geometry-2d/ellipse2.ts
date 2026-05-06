import { Vec2, type Vector2 } from '../linear/vec2';
import { MATH_EPSILON } from '../value/tolerance';
import type { BoundedCurve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Ellipse2 implements BoundedCurve2 {
    public readonly center: Vec2;
    public readonly domain = new ParameterDomain(0, Math.PI * 2);
    public readonly radiusX: number;
    public readonly radiusY: number;

    constructor(center: Vector2, radiusX: number, radiusY: number) {
        this.center = Vec2.from(center);
        this.radiusX = Math.max(radiusX, 0);
        this.radiusY = Math.max(radiusY, 0);
    }

    public pointAt(angleRadians: number): Vec2 {
        return this.center.translated(
            Vec2.of(Math.cos(angleRadians) * this.radiusX, Math.sin(angleRadians) * this.radiusY),
        );
    }

    public tangentAt(angleRadians: number): Vec2 {
        return Vec2.of(
            -Math.sin(angleRadians) * this.radiusX,
            Math.cos(angleRadians) * this.radiusY,
        ).normalize();
    }

    public isValid(): boolean {
        return this.center.isFinite() && this.radiusX > MATH_EPSILON && this.radiusY > MATH_EPSILON;
    }
}

export class EllipticalArc2 implements BoundedCurve2 {
    public readonly domain = ParameterDomain.unit();
    public readonly ellipse: Ellipse2;
    public readonly endAngleRadians: number;
    public readonly startAngleRadians: number;

    constructor(ellipse: Ellipse2, startAngleRadians: number, endAngleRadians: number) {
        this.ellipse = ellipse;
        this.startAngleRadians = startAngleRadians;
        this.endAngleRadians = endAngleRadians;
    }

    public pointAt(parameter: number): Vec2 {
        return this.ellipse.pointAt(this.angleAt(parameter));
    }

    public tangentAt(parameter: number): Vec2 {
        return this.ellipse.tangentAt(this.angleAt(parameter));
    }

    public isValid(): boolean {
        return this.ellipse.isValid();
    }

    private angleAt(parameter: number): number {
        return (
            this.startAngleRadians +
            (this.endAngleRadians - this.startAngleRadians) * this.domain.clamp(parameter)
        );
    }
}
