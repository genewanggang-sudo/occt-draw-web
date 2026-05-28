import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';
import { BBox2 } from './bbox2';
import { Curve2 } from './curve';
import { ParameterDomain } from './parameter';

export class Circle2 extends Curve2 {
    public readonly center: Vec2;
    public readonly domain = new ParameterDomain(0, Math.PI * 2);
    public readonly radius: number;

    constructor(center: Vector2, radius: number) {
        super();
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

    public override bounds(): GeometryResult<BBox2> {
        return this.isValid()
            ? GeometryResult.success(
                  new BBox2(
                      this.center.translated(Vec2.of(-this.radius, -this.radius)),
                      this.center.translated(Vec2.of(this.radius, this.radius)),
                  ),
              )
            : GeometryResult.empty();
    }

    public isValid(): boolean {
        return this.center.isFinite() && Number.isFinite(this.radius) && this.radius > MATH_EPSILON;
    }

    public static fromThreePoints(
        first: Vector2,
        second: Vector2,
        third: Vector2,
        tolerance = MATH_EPSILON,
    ): Circle2 | null {
        const firstPoint = Vec2.from(first);
        const secondPoint = Vec2.from(second);
        const thirdPoint = Vec2.from(third);

        if (!firstPoint.isFinite() || !secondPoint.isFinite() || !thirdPoint.isFinite()) {
            return null;
        }

        if (
            firstPoint.distanceTo(secondPoint) <= tolerance ||
            secondPoint.distanceTo(thirdPoint) <= tolerance ||
            thirdPoint.distanceTo(firstPoint) <= tolerance
        ) {
            return null;
        }

        const denominator =
            2 *
            (firstPoint.x * (secondPoint.y - thirdPoint.y) +
                secondPoint.x * (thirdPoint.y - firstPoint.y) +
                thirdPoint.x * (firstPoint.y - secondPoint.y));

        if (Math.abs(denominator) <= tolerance) {
            return null;
        }

        const firstLengthSquared = firstPoint.lengthSquared();
        const secondLengthSquared = secondPoint.lengthSquared();
        const thirdLengthSquared = thirdPoint.lengthSquared();
        const center = Vec2.of(
            (firstLengthSquared * (secondPoint.y - thirdPoint.y) +
                secondLengthSquared * (thirdPoint.y - firstPoint.y) +
                thirdLengthSquared * (firstPoint.y - secondPoint.y)) /
                denominator,
            (firstLengthSquared * (thirdPoint.x - secondPoint.x) +
                secondLengthSquared * (firstPoint.x - thirdPoint.x) +
                thirdLengthSquared * (secondPoint.x - firstPoint.x)) /
                denominator,
        );
        const radius = center.distanceTo(firstPoint);
        const circle = new Circle2(center, radius);

        return circle.isValid() ? circle : null;
    }
}
