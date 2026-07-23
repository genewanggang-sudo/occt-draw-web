import { Vec2 } from '../linear/vec2';
import { Angle } from '../value/angle';
import { AngularSweep } from '../value/angularSweep';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { ParameterDomain } from './parameterDomain';
import { Circle2 } from './circle2';
import { Curve2 } from './curve';
import type { Vector2 } from '../linear/vec2';

export class Arc2 extends Curve2 {
    private readonly angularSweep: AngularSweep;

    public readonly circle: Circle2;
    public readonly domain = ParameterDomain.unit();
    public readonly endAngle: Angle;
    public readonly startAngle: Angle;

    constructor(circle: Circle2, startAngle: Angle, endAngle: Angle) {
        super();
        this.circle = circle;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.angularSweep = new AngularSweep(startAngle.radians, endAngle.radians);
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

        const angles = [this.startAngle.radians, this.endAngle.radians];

        for (const angle of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
            if (this.angularSweep.containsAngleStrictly(angle)) {
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
            this.angularSweep.isNonZero(DEFAULT_TOLERANCE.angle)
        );
    }

    public static fromStartEndRadiusPoint(
        startPoint: Vector2,
        endPoint: Vector2,
        radiusPoint: Vector2,
        tolerance = DEFAULT_TOLERANCE.distance,
    ): Arc2 | null {
        const circle = Circle2.fromThreePoints(startPoint, endPoint, radiusPoint, tolerance);

        if (!circle) {
            return null;
        }

        const startAngle = Arc2.angleOfPoint(circle, startPoint);
        const endAngle = Arc2.angleOfPoint(circle, endPoint);
        const radiusAngle = Arc2.angleOfPoint(circle, radiusPoint);
        const positiveSweep = AngularSweep.positive(startAngle, endAngle);
        const sweep = positiveSweep.containsAngleStrictly(radiusAngle)
            ? positiveSweep
            : AngularSweep.negative(startAngle, endAngle);
        const arc = new Arc2(
            circle,
            Angle.fromRadians(sweep.startRadians),
            Angle.fromRadians(sweep.endRadians),
        );

        return arc.isValid() ? arc : null;
    }

    public static fromCenterStartEndPoint(
        centerPoint: Vector2,
        startPoint: Vector2,
        endDirectionPoint: Vector2,
        tolerance = DEFAULT_TOLERANCE.distance,
    ): Arc2 | null {
        const center = Vec2.from(centerPoint);
        const start = Vec2.from(startPoint);
        const endDirection = Vec2.from(endDirectionPoint);

        if (!center.isFinite() || !start.isFinite() || !endDirection.isFinite()) {
            return null;
        }

        const startVector = center.vectorTo(start);
        const endVector = center.vectorTo(endDirection);
        const radius = startVector.length();
        const endDirectionLength = endVector.length();

        if (
            !Number.isFinite(radius) ||
            !Number.isFinite(endDirectionLength) ||
            radius <= tolerance ||
            endDirectionLength <= tolerance
        ) {
            return null;
        }

        const startAngle = Math.atan2(startVector.y, startVector.x);
        const endAngle = Math.atan2(endVector.y, endVector.x);
        const sweep = AngularSweep.shortest(startAngle, endAngle);
        const arc = new Arc2(
            new Circle2(center, radius),
            Angle.fromRadians(sweep.startRadians),
            Angle.fromRadians(sweep.endRadians),
        );

        return arc.isValid() ? arc : null;
    }

    public static fromStartEndTangent(
        startPoint: Vector2,
        endPoint: Vector2,
        startTangent: Vector2,
        tolerance = DEFAULT_TOLERANCE.distance,
    ): Arc2 | null {
        const start = Vec2.from(startPoint);
        const end = Vec2.from(endPoint);
        const tangent = Vec2.normalize(startTangent);

        if (!start.isFinite() || !end.isFinite() || !tangent.isFinite()) {
            return null;
        }

        const chord = start.vectorTo(end);

        if (chord.length() <= tolerance || tangent.length() <= tolerance) {
            return null;
        }

        const normal = tangent.perpendicularLeft();
        const normalProjection = chord.dot(normal);

        if (Math.abs(normalProjection) <= tolerance) {
            return null;
        }

        const signedRadius = chord.lengthSquared() / (2 * normalProjection);
        const center = start.translated(normal.scale(signedRadius));
        const radius = Math.abs(signedRadius);
        const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
        const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
        const sweep =
            signedRadius > 0
                ? AngularSweep.positive(startAngle, endAngle)
                : AngularSweep.negative(startAngle, endAngle);
        const arc = new Arc2(
            new Circle2(center, radius),
            Angle.fromRadians(sweep.startRadians),
            Angle.fromRadians(sweep.endRadians),
        );

        return arc.isValid() ? arc : null;
    }

    private angleAt(parameter: number): Angle {
        return Angle.fromRadians(this.angularSweep.angleAt(this.domain.clamp(parameter)));
    }

    private static angleOfPoint(circle: Circle2, point: Vector2): number {
        return Math.atan2(point.y - circle.center.y, point.x - circle.center.x);
    }
}
