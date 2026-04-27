import { MATH_EPSILON, areNumbersEqual } from './tolerance';

export interface Vector2 {
    x: number;
    y: number;
}

export class Vec2 implements Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    copyFrom(value: Vector2): this {
        return this.set(value.x, value.y);
    }

    addInPlace(value: Vector2): this {
        this.x += value.x;
        this.y += value.y;
        return this;
    }

    added(value: Vector2): Vec2 {
        return this.clone().addInPlace(value);
    }

    subtractInPlace(value: Vector2): this {
        this.x -= value.x;
        this.y -= value.y;
        return this;
    }

    subtracted(value: Vector2): Vec2 {
        return this.clone().subtractInPlace(value);
    }

    scaleInPlace(scale: number): this {
        this.x *= scale;
        this.y *= scale;
        return this;
    }

    scaled(scale: number): Vec2 {
        return this.clone().scaleInPlace(scale);
    }

    dot(value: Vector2): number {
        return this.x * value.x + this.y * value.y;
    }

    length(): number {
        return Math.hypot(this.x, this.y);
    }

    distanceTo(value: Vector2): number {
        return this.subtracted(value).length();
    }

    normalizeInPlace(): this {
        const length = this.length();

        if (length <= MATH_EPSILON) {
            return this.set(0, 0);
        }

        return this.scaleInPlace(1 / length);
    }

    normalized(): Vec2 {
        return this.clone().normalizeInPlace();
    }

    equals(value: Vector2, tolerance = MATH_EPSILON): boolean {
        return (
            areNumbersEqual(this.x, value.x, tolerance) &&
            areNumbersEqual(this.y, value.y, tolerance)
        );
    }

    static from(value: Vector2): Vec2 {
        return new Vec2(value.x, value.y);
    }
}

export class Point2 extends Vec2 {
    override clone(): Point2 {
        return new Point2(this.x, this.y);
    }

    translated(vector: Vector2): Point2 {
        return this.clone().addInPlace(vector);
    }

    vectorTo(point: Vector2): Vec2 {
        return new Vec2(point.x - this.x, point.y - this.y);
    }

    static override from(value: Vector2): Point2 {
        return new Point2(value.x, value.y);
    }
}

export function createVector2(x: number, y: number): Vec2 {
    return new Vec2(x, y);
}

export function createPoint2(x: number, y: number): Point2 {
    return new Point2(x, y);
}
