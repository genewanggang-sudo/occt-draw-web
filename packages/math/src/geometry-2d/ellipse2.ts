import { Coord2 } from '../coordinate/coord2';
import { Vec2, type Vector2 } from '../linear/vec2';
import { ImmutableResultPayloadSnapshotter } from '../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameterDomain';

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

    public angleOfPoint(point: Vector2): number {
        const localPoint = this.coord.worldToLocal(point);

        return Math.atan2(localPoint.y / this.minorRadius, localPoint.x / this.majorRadius);
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
            new ImmutableResultPayloadSnapshotter<BBox2>(),
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
