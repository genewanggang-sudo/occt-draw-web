import { Coord2 } from '../coordinate/coord2';
import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE, MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Ellipse2 extends Curve2 {
    public readonly coord: Coord2;
    public readonly domain = new ParameterDomain(0, Math.PI * 2);
    public readonly majorRadius: number;
    public readonly minorRadius: number;

    constructor(input: {
        readonly coord: Coord2;
        readonly majorRadius: number;
        readonly minorRadius: number;
    }) {
        super();
        this.coord = input.coord;
        this.majorRadius = input.majorRadius;
        this.minorRadius = input.minorRadius;
    }

    public get center(): Vec2 {
        return this.coord.origin;
    }

    public get radiusX(): number {
        return this.majorRadius;
    }

    public get radiusY(): number {
        return this.minorRadius;
    }

    public pointAt(angleRadians: number): Vec2 {
        return this.coord.localToWorld(
            Vec2.of(
                Math.cos(angleRadians) * this.majorRadius,
                Math.sin(angleRadians) * this.minorRadius,
            ),
        );
    }

    public tangentAt(angleRadians: number): Vec2 {
        return this.coord
            .localToWorld(
                Vec2.of(
                    -Math.sin(angleRadians) * this.majorRadius,
                    Math.cos(angleRadians) * this.minorRadius,
                ),
            )
            .subtract(this.coord.origin)
            .normalize();
    }

    public override bounds(): GeometryResult<BBox2> {
        if (!this.isValid()) {
            return GeometryResult.empty();
        }

        const halfWidth = Math.hypot(
            this.majorRadius * this.coord.xAxis.x,
            this.minorRadius * this.coord.yAxis.x,
        );
        const halfHeight = Math.hypot(
            this.majorRadius * this.coord.xAxis.y,
            this.minorRadius * this.coord.yAxis.y,
        );

        return GeometryResult.success(
            new BBox2(
                this.center.translated(Vec2.of(-halfWidth, -halfHeight)),
                this.center.translated(Vec2.of(halfWidth, halfHeight)),
            ),
        );
    }

    public isValid(): boolean {
        return (
            this.center.isFinite() &&
            this.coord.xAxis.isFinite() &&
            this.coord.yAxis.isFinite() &&
            Number.isFinite(this.majorRadius) &&
            Number.isFinite(this.minorRadius) &&
            this.majorRadius > MATH_EPSILON &&
            this.minorRadius > MATH_EPSILON
        );
    }

    public static axisAligned(center: Vector2, radiusX: number, radiusY: number): Ellipse2 {
        return new Ellipse2({
            coord: new Coord2({ origin: center }),
            majorRadius: radiusX,
            minorRadius: radiusY,
        });
    }

    public static fromAxisPoints(
        firstAxisPoint: Vector2,
        secondAxisPoint: Vector2,
        minorPoint: Vector2,
        tolerance = MATH_EPSILON,
    ): Ellipse2 | null {
        const first = Vec2.from(firstAxisPoint);
        const second = Vec2.from(secondAxisPoint);
        const minor = Vec2.from(minorPoint);

        if (!first.isFinite() || !second.isFinite() || !minor.isFinite()) {
            return null;
        }

        const center = Vec2.lerp(first, second, 0.5);
        const majorVector = center.vectorTo(second);
        const majorRadius = majorVector.length();

        if (majorRadius <= tolerance) {
            return null;
        }

        const xAxis = majorVector.normalize();
        const yAxis = xAxis.perpendicularLeft();
        const minorRadius = Math.abs(center.vectorTo(minor).dot(yAxis));

        if (minorRadius <= tolerance) {
            return null;
        }

        const ellipse = new Ellipse2({
            coord: new Coord2({ origin: center, xAxis, yAxis }),
            majorRadius,
            minorRadius,
        });

        return ellipse.isValid() ? ellipse : null;
    }

    public static fromCenterAxisPoints(
        centerPoint: Vector2,
        primaryAxisPoint: Vector2,
        secondaryPoint: Vector2,
        tolerance = MATH_EPSILON,
    ): Ellipse2 | null {
        const center = Vec2.from(centerPoint);
        const primary = Vec2.from(primaryAxisPoint);
        const secondary = Vec2.from(secondaryPoint);

        if (!center.isFinite() || !primary.isFinite() || !secondary.isFinite()) {
            return null;
        }

        const primaryVector = center.vectorTo(primary);
        const primaryRadius = primaryVector.length();

        if (primaryRadius <= tolerance) {
            return null;
        }

        const xAxis = primaryVector.normalize();
        const yAxis = xAxis.perpendicularLeft();
        const secondaryRadius = Math.abs(center.vectorTo(secondary).dot(yAxis));

        if (secondaryRadius <= tolerance) {
            return null;
        }

        const ellipse = new Ellipse2({
            coord: new Coord2({ origin: center, xAxis, yAxis }),
            majorRadius: primaryRadius,
            minorRadius: secondaryRadius,
        });

        return ellipse.isValid() ? ellipse : null;
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

        if (Math.abs(this.endAngleRadians - this.startAngleRadians) >= Math.PI * 2) {
            return this.ellipse.bounds();
        }

        const angles = [this.startAngleRadians, this.endAngleRadians];

        for (const angle of this.extremaAngles()) {
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

    private extremaAngles(): readonly number[] {
        const { coord, majorRadius, minorRadius } = this.ellipse;
        const xExtremaAngle = Math.atan2(minorRadius * coord.yAxis.x, majorRadius * coord.xAxis.x);
        const yExtremaAngle = Math.atan2(minorRadius * coord.yAxis.y, majorRadius * coord.xAxis.y);

        return [xExtremaAngle, xExtremaAngle + Math.PI, yExtremaAngle, yExtremaAngle + Math.PI];
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
