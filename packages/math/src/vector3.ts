import { MATH_EPSILON, areNumbersEqual } from './tolerance';

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export class Vec3 implements Vector3 {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    public clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    public set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    public copyFrom(value: Vector3): this {
        return this.set(value.x, value.y, value.z);
    }

    public addInPlace(value: Vector3): this {
        this.x += value.x;
        this.y += value.y;
        this.z += value.z;
        return this;
    }

    public added(value: Vector3): Vec3 {
        return this.clone().addInPlace(value);
    }

    public subtractInPlace(value: Vector3): this {
        this.x -= value.x;
        this.y -= value.y;
        this.z -= value.z;
        return this;
    }

    public subtracted(value: Vector3): Vec3 {
        return this.clone().subtractInPlace(value);
    }

    public scaleInPlace(scale: number): this {
        this.x *= scale;
        this.y *= scale;
        this.z *= scale;
        return this;
    }

    public scaled(scale: number): Vec3 {
        return this.clone().scaleInPlace(scale);
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

    public distanceTo(value: Vector3): number {
        return this.subtracted(value).length();
    }

    public normalizeInPlace(): this {
        const length = this.length();

        if (length <= MATH_EPSILON) {
            return this.set(0, 0, 0);
        }

        return this.scaleInPlace(1 / length);
    }

    public normalized(): Vec3 {
        return this.clone().normalizeInPlace();
    }

    public rotateAroundAxis(axis: Vector3, radians: number): Vec3 {
        const unitAxis = Vec3.from(axis).normalizeInPlace();

        if (unitAxis.length() <= MATH_EPSILON) {
            return this.clone();
        }

        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const parallel = unitAxis.scaled(unitAxis.dot(this) * (1 - cos));
        const perpendicular = this.scaled(cos);
        const tangent = unitAxis.cross(this).scaleInPlace(sin);

        return perpendicular.addInPlace(tangent).addInPlace(parallel);
    }

    public equals(value: Vector3, tolerance = MATH_EPSILON): boolean {
        return (
            areNumbersEqual(this.x, value.x, tolerance) &&
            areNumbersEqual(this.y, value.y, tolerance) &&
            areNumbersEqual(this.z, value.z, tolerance)
        );
    }

    public static from(value: Vector3): Vec3 {
        return new Vec3(value.x, value.y, value.z);
    }

    public static zero(): Vec3 {
        return new Vec3(0, 0, 0);
    }
}

export class Point3 extends Vec3 {
    public override clone(): Point3 {
        return new Point3(this.x, this.y, this.z);
    }

    public translated(vector: Vector3): Point3 {
        return this.clone().addInPlace(vector);
    }

    public vectorTo(point: Vector3): Vec3 {
        return new Vec3(point.x - this.x, point.y - this.y, point.z - this.z);
    }

    public static override from(value: Vector3): Point3 {
        return new Point3(value.x, value.y, value.z);
    }
}

export function createVector3(x: number, y: number, z: number): Vec3 {
    return new Vec3(x, y, z);
}

export function createPoint3(x: number, y: number, z: number): Point3 {
    return new Point3(x, y, z);
}

export function addVector3(left: Vector3, right: Vector3): Vec3 {
    return Vec3.from(left).addInPlace(right);
}

export function subtractVector3(left: Vector3, right: Vector3): Vec3 {
    return Vec3.from(left).subtractInPlace(right);
}

export function scaleVector3(vector: Vector3, scale: number): Vec3 {
    return Vec3.from(vector).scaleInPlace(scale);
}

export function dotVector3(left: Vector3, right: Vector3): number {
    return Vec3.from(left).dot(right);
}

export function crossVector3(left: Vector3, right: Vector3): Vec3 {
    return Vec3.from(left).cross(right);
}

export function lengthVector3(vector: Vector3): number {
    return Vec3.from(vector).length();
}

export function distanceVector3(left: Vector3, right: Vector3): number {
    return Vec3.from(left).distanceTo(right);
}

export function normalizeVector3(vector: Vector3): Vec3 {
    return Vec3.from(vector).normalizeInPlace();
}

export function rotateVectorAroundAxis(vector: Vector3, axis: Vector3, radians: number): Vec3 {
    return Vec3.from(vector).rotateAroundAxis(axis, radians);
}
