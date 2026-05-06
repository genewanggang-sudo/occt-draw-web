import { Vec2, type Vector2 } from '../linear/vec2';

export class Coord2 {
    public readonly origin: Vec2;
    public readonly xAxis: Vec2;
    public readonly yAxis: Vec2;

    constructor(input: {
        readonly origin: Vector2;
        readonly xAxis?: Vector2;
        readonly yAxis?: Vector2;
    }) {
        this.origin = Vec2.from(input.origin);
        this.xAxis = Vec2.from(input.xAxis ?? { x: 1, y: 0 }).normalize();
        this.yAxis = Vec2.from(input.yAxis ?? this.xAxis.perpendicularLeft()).normalize();
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
}
