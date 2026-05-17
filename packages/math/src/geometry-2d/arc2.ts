import { Vec2 } from '../linear/vec2';
import { Angle } from '../value/angle';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { ParameterDomain } from './parameter';
import type { Circle2 } from './circle2';
import { Curve2 } from './curve';

export class Arc2 extends Curve2 {
    public readonly circle: Circle2;
    public readonly domain = ParameterDomain.unit();
    public readonly endAngle: Angle;
    public readonly startAngle: Angle;

    constructor(circle: Circle2, startAngle: Angle, endAngle: Angle) {
        super();
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

    public override bounds(): GeometryResult<BBox2> {
        if (!this.isValid()) {
            return GeometryResult.empty();
        }

        const startAngle = this.startAngle.radians;
        const endAngle = this.endAngle.radians;
        const angles = [startAngle, endAngle];

        for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
            if (Arc2.isAngleInSweep(angle, startAngle, endAngle)) {
                angles.push(angle);
            }
        }

        const bounds = BBox2.fromPoints(angles.map((angle) => this.circle.pointAt(angle)));

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
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

    private static isAngleInSweep(angle: number, startAngle: number, endAngle: number): boolean {
        const span = endAngle - startAngle;
        const twoPi = Math.PI * 2;

        if (span === 0) {
            return false;
        }

        let candidate =
            span > 0
                ? angle + Math.ceil((startAngle - angle) / twoPi) * twoPi
                : angle + Math.floor((startAngle - angle) / twoPi) * twoPi;

        if (span > 0 && candidate <= startAngle) {
            candidate += twoPi;
        }

        if (span < 0 && candidate >= startAngle) {
            candidate -= twoPi;
        }

        const progress = (candidate - startAngle) / span;

        return progress > 0 && progress < 1;
    }
}
