import { DEFAULT_TOLERANCE, MATH_EPSILON } from '../value/tolerance';

export interface Vector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export class Vec3 implements Vector3 {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public add(value: Vector3): Vec3 {
        return new Vec3(this.x + value.x, this.y + value.y, this.z + value.z);
    }

    public subtract(value: Vector3): Vec3 {
        return new Vec3(this.x - value.x, this.y - value.y, this.z - value.z);
    }

    public scale(scale: number): Vec3 {
        return new Vec3(this.x * scale, this.y * scale, this.z * scale);
    }

    public negate(): Vec3 {
        return this.scale(-1);
    }

    public dot(value: Vector3): number {
        return this.x * value.x + this.y * value.y + this.z * value.z;
    }

    public cross(value: Vector3): Vec3 {
        return new Vec3(
            this.y * value.z - this.z * value.y,
            this.z * value.x - this.x * value.z,
            this.x * value.y - this.y * value.x,
        );
    }

    public length(): number {
        return Math.hypot(this.x, this.y, this.z);
    }

    public lengthSquared(): number {
        return this.dot(this);
    }

    public distanceTo(value: Vector3): number {
        return Vec3.distance(this, value);
    }

    public distanceSquaredTo(value: Vector3): number {
        const dx = this.x - value.x;
        const dy = this.y - value.y;
        const dz = this.z - value.z;

        return dx * dx + dy * dy + dz * dz;
    }

    public translated(vector: Vector3): Vec3 {
        return this.add(vector);
    }

    public vectorTo(point: Vector3): Vec3 {
        return Vec3.subtract(point, this);
    }

    public normalize(): Vec3 {
        const length = this.length();

        return !Number.isFinite(length) || length <= MATH_EPSILON
            ? Vec3.zero()
            : this.scale(1 / length);
    }

    public rotateAroundAxis(axis: Vector3, radians: number): Vec3 {
        const unitAxis = Vec3.normalize(axis);

        if (unitAxis.isNearZero()) {
            return this;
        }

        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const parallel = unitAxis.scale(unitAxis.dot(this) * (1 - cos));
        const perpendicular = this.scale(cos);
        const tangent = unitAxis.cross(this).scale(sin);

        return perpendicular.add(tangent).add(parallel);
    }

    public equals(value: Vector3, tolerance = MATH_EPSILON): boolean {
        return (
            DEFAULT_TOLERANCE.equals(this.x, value.x, tolerance) &&
            DEFAULT_TOLERANCE.equals(this.y, value.y, tolerance) &&
            DEFAULT_TOLERANCE.equals(this.z, value.z, tolerance)
        );
    }

    public isFinite(): boolean {
        return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z);
    }

    public isNearZero(tolerance = MATH_EPSILON): boolean {
        return this.lengthSquared() <= tolerance * tolerance;
    }

    public static from(value: Vector3): Vec3 {
        return new Vec3(value.x, value.y, value.z);
    }

    public static of(x: number, y: number, z: number): Vec3 {
        return new Vec3(x, y, z);
    }

    public static zero(): Vec3 {
        return new Vec3(0, 0, 0);
    }

    public static add(left: Vector3, right: Vector3): Vec3 {
        return new Vec3(left.x + right.x, left.y + right.y, left.z + right.z);
    }

    public static subtract(left: Vector3, right: Vector3): Vec3 {
        return new Vec3(left.x - right.x, left.y - right.y, left.z - right.z);
    }

    public static scale(vector: Vector3, scale: number): Vec3 {
        return new Vec3(vector.x * scale, vector.y * scale, vector.z * scale);
    }

    public static dot(left: Vector3, right: Vector3): number {
        return left.x * right.x + left.y * right.y + left.z * right.z;
    }

    public static cross(left: Vector3, right: Vector3): Vec3 {
        return new Vec3(
            left.y * right.z - left.z * right.y,
            left.z * right.x - left.x * right.z,
            left.x * right.y - left.y * right.x,
        );
    }

    public static distance(left: Vector3, right: Vector3): number {
        return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
    }

    public static length(vector: Vector3): number {
        return Math.hypot(vector.x, vector.y, vector.z);
    }

    public static normalize(vector: Vector3): Vec3 {
        const length = Vec3.length(vector);

        return !Number.isFinite(length) || length <= MATH_EPSILON
            ? Vec3.zero()
            : new Vec3(vector.x / length, vector.y / length, vector.z / length);
    }

    public static rotateAroundAxis(vector: Vector3, axis: Vector3, radians: number): Vec3 {
        const unitAxis = Vec3.normalize(axis);

        if (unitAxis.isNearZero()) {
            return Vec3.from(vector);
        }

        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const parallel = Vec3.scale(unitAxis, Vec3.dot(unitAxis, vector) * (1 - cos));
        const perpendicular = Vec3.scale(vector, cos);
        const tangent = Vec3.scale(Vec3.cross(unitAxis, vector), sin);

        return Vec3.add(Vec3.add(perpendicular, tangent), parallel);
    }

    public static lerp(start: Vector3, end: Vector3, progress: number): Vec3 {
        return new Vec3(
            start.x + (end.x - start.x) * progress,
            start.y + (end.y - start.y) * progress,
            start.z + (end.z - start.z) * progress,
        );
    }
}
