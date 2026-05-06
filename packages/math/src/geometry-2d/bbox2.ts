import { Vec2, type Vector2 } from '../linear/vec2';

export class BBox2 {
    public readonly max: Vec2;
    public readonly min: Vec2;

    constructor(min: Vector2, max: Vector2) {
        this.min = Vec2.of(Math.min(min.x, max.x), Math.min(min.y, max.y));
        this.max = Vec2.of(Math.max(min.x, max.x), Math.max(min.y, max.y));
    }

    public get center(): Vec2 {
        return Vec2.of((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2);
    }

    public get size(): Vec2 {
        return this.min.vectorTo(this.max);
    }

    public contains(point: Vector2): boolean {
        return (
            this.isFinite() &&
            point.x >= this.min.x &&
            point.x <= this.max.x &&
            point.y >= this.min.y &&
            point.y <= this.max.y
        );
    }

    public expandByPoint(point: Vector2): BBox2 {
        if (!this.isFinite()) {
            return new BBox2(point, point);
        }

        return new BBox2(
            Vec2.of(Math.min(this.min.x, point.x), Math.min(this.min.y, point.y)),
            Vec2.of(Math.max(this.max.x, point.x), Math.max(this.max.y, point.y)),
        );
    }

    public isFinite(): boolean {
        return this.min.isFinite() && this.max.isFinite();
    }

    public static fromPoints(points: readonly Vector2[]): BBox2 | undefined {
        let bounds: BBox2 | null = null;

        for (const point of points) {
            if (!Vec2.from(point).isFinite()) {
                continue;
            }

            bounds = bounds ? bounds.expandByPoint(point) : new BBox2(point, point);
        }

        return bounds ?? undefined;
    }
}
