import type { Vec2, Vector2 } from '../linear/vec2';
import { AngularSweep } from '../value/angularSweep';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import type { Ellipse2 } from './ellipse2';
import { ParameterDomain } from './parameterDomain';

export class EllipticalArc2 extends Curve2 {
    private readonly angularSweep: AngularSweep;

    public readonly domain = ParameterDomain.unit();
    public readonly ellipse: Ellipse2;
    public readonly endAngleRadians: number;
    public readonly startAngleRadians: number;

    constructor(ellipse: Ellipse2, startAngleRadians: number, endAngleRadians: number) {
        super();
        this.ellipse = ellipse;
        this.startAngleRadians = startAngleRadians;
        this.endAngleRadians = endAngleRadians;
        this.angularSweep = new AngularSweep(startAngleRadians, endAngleRadians);
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

        if (this.angularSweep.isFullTurn) {
            return this.ellipse.bounds();
        }

        const angles = [this.startAngleRadians, this.endAngleRadians];

        for (const angle of this.extremaAngles()) {
            if (this.angularSweep.containsAngleStrictly(angle)) {
                angles.push(angle);
            }
        }

        const bounds = BBox2.fromPoints(angles.map((angle) => this.ellipse.pointAt(angle)));

        return bounds
            ? GeometryResult.success(bounds, new ImmutableResultPayloadSnapshotter<BBox2>())
            : GeometryResult.empty();
    }

    public isValid(): boolean {
        return (
            this.ellipse.isValid() &&
            Number.isFinite(this.startAngleRadians) &&
            Number.isFinite(this.endAngleRadians) &&
            this.angularSweep.isNonZero(DEFAULT_TOLERANCE.angle)
        );
    }

    public static fromStartEndPoints(
        ellipse: Ellipse2,
        startPoint: Vector2,
        endPoint: Vector2,
        direction: 'negative' | 'positive' = 'positive',
    ): EllipticalArc2 | null {
        if (!ellipse.isValid()) {
            return null;
        }

        const startAngle = ellipse.angleOfPoint(startPoint);
        const endAngle = ellipse.angleOfPoint(endPoint);
        const sweep =
            direction === 'positive'
                ? AngularSweep.positive(startAngle, endAngle)
                : AngularSweep.negative(startAngle, endAngle);
        const arc = new EllipticalArc2(ellipse, sweep.startRadians, sweep.endRadians);

        return arc.isValid() ? arc : null;
    }

    private angleAt(parameter: number): number {
        return this.angularSweep.angleAt(this.domain.clamp(parameter));
    }

    private extremaAngles(): readonly number[] {
        const { coord, majorRadius, minorRadius } = this.ellipse;
        const xExtremaAngle = Math.atan2(minorRadius * coord.yAxis.x, majorRadius * coord.xAxis.x);
        const yExtremaAngle = Math.atan2(minorRadius * coord.yAxis.y, majorRadius * coord.xAxis.y);

        return [xExtremaAngle, xExtremaAngle + Math.PI, yExtremaAngle, yExtremaAngle + Math.PI];
    }
}
