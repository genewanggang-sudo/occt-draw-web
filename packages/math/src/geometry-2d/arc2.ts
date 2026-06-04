import { Vec2 } from '../linear/vec2';
import { Angle } from '../value/angle';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { ParameterDomain } from './parameter';
import { Circle2 } from './circle2';
import { Curve2 } from './curve';
import type { Vector2 } from '../linear/vec2';

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

        const startAngle = angleOfPoint(circle, startPoint);
        const endAngle = angleOfPoint(circle, endPoint);
        const radiusAngle = angleOfPoint(circle, radiusPoint);
        const positiveEndAngle = adjustAngleAbove(endAngle, startAngle);
        const negativeEndAngle = adjustAngleBelow(endAngle, startAngle);
        const arc = Arc2.isAngleInSweep(radiusAngle, startAngle, positiveEndAngle)
            ? new Arc2(circle, Angle.fromRadians(startAngle), Angle.fromRadians(positiveEndAngle))
            : new Arc2(circle, Angle.fromRadians(startAngle), Angle.fromRadians(negativeEndAngle));

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
        const sweep = normalizeAngleDelta(endAngle - startAngle);
        const arc = new Arc2(
            new Circle2(center, radius),
            Angle.fromRadians(startAngle),
            Angle.fromRadians(startAngle + sweep),
        );

        return arc.isValid() ? arc : null;
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

function angleOfPoint(circle: Circle2, point: Vector2): number {
    return Math.atan2(point.y - circle.center.y, point.x - circle.center.x);
}

function adjustAngleAbove(angle: number, floor: number): number {
    const twoPi = Math.PI * 2;
    let adjusted = angle;

    while (adjusted <= floor) {
        adjusted += twoPi;
    }

    return adjusted;
}

function adjustAngleBelow(angle: number, ceiling: number): number {
    const twoPi = Math.PI * 2;
    let adjusted = angle;

    while (adjusted >= ceiling) {
        adjusted -= twoPi;
    }

    return adjusted;
}

function normalizeAngleDelta(delta: number): number {
    const fullTurn = Math.PI * 2;
    let normalized = delta;

    while (normalized <= -Math.PI) {
        normalized += fullTurn;
    }

    while (normalized > Math.PI) {
        normalized -= fullTurn;
    }

    return normalized;
}
