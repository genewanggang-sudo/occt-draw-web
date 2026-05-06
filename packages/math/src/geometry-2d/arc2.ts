import { Vec2 } from '../linear/vec2';
import { Angle } from '../value/angle';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { ParameterDomain } from './parameter';
import type { Circle2 } from './circle2';
import type { BoundedCurve2 } from './curve';

export class Arc2 implements BoundedCurve2 {
    public readonly circle: Circle2;
    public readonly domain = ParameterDomain.unit();
    public readonly endAngle: Angle;
    public readonly startAngle: Angle;

    constructor(circle: Circle2, startAngle: Angle, endAngle: Angle) {
        this.circle = circle;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
    }

    public pointAt(parameter: number): ReturnType<Circle2['pointAt']> {
        return this.circle.pointAt(this.angleAt(parameter).radians);
    }

    public tangentAt(parameter: number): Vec2 {
        const angle = this.angleAt(parameter).radians;

        return Vec2.of(-Math.sin(angle), Math.cos(angle)).normalize();
    }

    public isValid(): boolean {
        return (
            this.circle.isValid() &&
            Number.isFinite(this.startAngle.radians) &&
            Number.isFinite(this.endAngle.radians) &&
            !DEFAULT_TOLERANCE.isNearZeroAngle(this.endAngle.radians - this.startAngle.radians)
        );
    }

    private angleAt(parameter: number): Angle {
        return Angle.lerp(this.startAngle, this.endAngle, this.domain.clamp(parameter));
    }
}
