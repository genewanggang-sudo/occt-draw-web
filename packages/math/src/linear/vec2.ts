import { MATH_EPSILON, areNumbersEqual } from '../value/tolerance';

export interface Vector2 {
    readonly x: number;
    readonly y: number;
}

export class Vec2 implements Vector2 {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public add(value: Vector2): Vec2 {
        return new Vec2(this.x + value.x, this.y + value.y);
    }

    public subtract(value: Vector2): Vec2 {
        return new Vec2(this.x - value.x, this.y - value.y);
    }

    public scale(scale: number): Vec2 {
        return new Vec2(this.x * scale, this.y * scale);
    }

    public dot(value: Vector2): number {
        return this.x * value.x + this.y * value.y;
    }

    public cross(value: Vector2): number {
        return this.x * value.y - this.y * value.x;
    }

    public length(): number {
        return Math.hypot(this.x, this.y);
    }

    public lengthSquared(): number {
        return this.dot(this);
    }

    public distanceTo(value: Vector2): number {
        return this.subtract(value).length();
    }

    public distanceSquaredTo(value: Vector2): number {
        return this.subtract(value).lengthSquared();
    }

    public translated(vector: Vector2): Vec2 {
        return this.add(vector);
    }

    public vectorTo(point: Vector2): Vec2 {
        return Vec2.from(point).subtract(this);
    }

    public normalize(): Vec2 {
        const length = this.length();

        return !Number.isFinite(length) || length <= MATH_EPSILON
            ? Vec2.zero()
            : this.scale(1 / length);
    }

    public perpendicularLeft(): Vec2 {
        return new Vec2(-this.y, this.x);
    }

    public equals(value: Vector2, tolerance = MATH_EPSILON): boolean {
        return (
            areNumbersEqual(this.x, value.x, tolerance) &&
            areNumbersEqual(this.y, value.y, tolerance)
        );
    }

    public isFinite(): boolean {
        return Number.isFinite(this.x) && Number.isFinite(this.y);
    }

    public isNearZero(tolerance = MATH_EPSILON): boolean {
        return this.lengthSquared() <= tolerance * tolerance;
    }

    public static from(value: Vector2): Vec2 {
        return new Vec2(value.x, value.y);
    }

    public static of(x: number, y: number): Vec2 {
        return new Vec2(x, y);
    }

    public static zero(): Vec2 {
        return new Vec2(0, 0);
    }

    public static distance(left: Vector2, right: Vector2): number {
        return Vec2.from(left).distanceTo(right);
    }

    public static length(vector: Vector2): number {
        return Vec2.from(vector).length();
    }

    public static normalize(vector: Vector2): Vec2 {
        return Vec2.from(vector).normalize();
    }

    public static lerp(start: Vector2, end: Vector2, progress: number): Vec2 {
        return new Vec2(
            start.x + (end.x - start.x) * progress,
            start.y + (end.y - start.y) * progress,
        );
    }
}
