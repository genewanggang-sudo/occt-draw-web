import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE, MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Ellipse2 extends Curve2 {
    public readonly center: Vec2;
    public readonly domain = new ParameterDomain(0, Math.PI * 2);
    public readonly radiusX: number;
    public readonly radiusY: number;

    constructor(center: Vector2, radiusX: number, radiusY: number) {
        super();
        this.center = Vec2.from(center);
        this.radiusX = radiusX;
        this.radiusY = radiusY;
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

    public override bounds(): GeometryResult<BBox2> {
        return this.isValid()
            ? GeometryResult.success(
                  new BBox2(
                      this.center.translated(Vec2.of(-this.radiusX, -this.radiusY)),
                      this.center.translated(Vec2.of(this.radiusX, this.radiusY)),
                  ),
              )
            : GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.center.isFinite() &&
            Number.isFinite(this.radiusX) &&
            Number.isFinite(this.radiusY) &&
            this.radiusX > MATH_EPSILON &&
            this.radiusY > MATH_EPSILON
        );
    }
}

export class EllipticalArc2 extends Curve2 {
    public readonly domain = ParameterDomain.unit();
    public readonly ellipse: Ellipse2;
    public readonly endAngleRadians: number;
    public readonly startAngleRadians: number;

    constructor(ellipse: Ellipse2, startAngleRadians: number, endAngleRadians: number) {
        super();
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

    public override bounds(): GeometryResult<BBox2> {
        if (!this.isValid()) {
            return GeometryResult.empty();
        }

        const angles = [this.startAngleRadians, this.endAngleRadians];

        for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
            if (
                EllipticalArc2.isAngleInSweep(angle, this.startAngleRadians, this.endAngleRadians)
            ) {
                angles.push(angle);
            }
        }

        const bounds = BBox2.fromPoints(angles.map((angle) => this.ellipse.pointAt(angle)));

        return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.ellipse.isValid() &&
            Number.isFinite(this.startAngleRadians) &&
            Number.isFinite(this.endAngleRadians) &&
            !DEFAULT_TOLERANCE.isNearZeroAngle(this.endAngleRadians - this.startAngleRadians)
        );
    }

    private angleAt(parameter: number): number {
        return (
            this.startAngleRadians +
            (this.endAngleRadians - this.startAngleRadians) * this.domain.clamp(parameter)
        );
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
