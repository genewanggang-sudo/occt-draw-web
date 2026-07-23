import { Vec2, type Vector2 } from '../linear/vec2';
import { MATH_EPSILON } from '../value/tolerance';

export class Coord2 {
    public readonly origin: Vec2;
    public readonly xAxis: Vec2;
    public readonly yAxis: Vec2;

    constructor(input: {
        readonly origin: Vector2;
        readonly xAxis?: Vector2;
        readonly yAxis?: Vector2;
    }) {
        this.origin = Coord2.normalizeOrigin(input.origin);
        this.xAxis = Coord2.normalizeAxis(input.xAxis ?? { x: 1, y: 0 }, Vec2.of(1, 0));
        this.yAxis = Coord2.normalizeYAxis(this.xAxis, input.yAxis);
    }

    public localToWorld(point: Vector2): Vec2 {
        return this.origin
            .translated(this.xAxis.scale(point.x))
            .translated(this.yAxis.scale(point.y));
    }

    public worldToLocal(point: Vector2): Vec2 {
        const vector = this.origin.vectorTo(point);

        return Vec2.of(vector.dot(this.xAxis), vector.dot(this.yAxis));
    }

    public static identity(): Coord2 {
        return new Coord2({ origin: Vec2.zero() });
    }

    private static normalizeOrigin(origin: Vector2): Vec2 {
        const value = Vec2.from(origin);

        return value.isFinite() ? value : Vec2.zero();
    }

    private static normalizeAxis(value: Vector2, fallback: Vec2): Vec2 {
        const vector = Vec2.from(value);

        return vector.isFinite() && !vector.isNearZero() ? vector.normalize() : fallback;
    }

    private static normalizeYAxis(xAxis: Vec2, yAxis: Vector2 | undefined): Vec2 {
        if (yAxis) {
            const projected = Vec2.subtract(yAxis, Vec2.scale(xAxis, Vec2.dot(yAxis, xAxis)));

            if (projected.isFinite() && projected.length() > MATH_EPSILON) {
                return projected.normalize();
            }
        }

        return xAxis.perpendicularLeft();
    }
}
