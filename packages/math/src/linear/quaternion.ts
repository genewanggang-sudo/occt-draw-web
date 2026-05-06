import { MATH_EPSILON } from '../value/tolerance';
import { Vec3, type Vector3 } from './vec3';

export class Quaternion {
    public readonly w: number;
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    public normalize(): Quaternion {
        const length = Math.hypot(this.x, this.y, this.z, this.w);

        return length <= MATH_EPSILON
            ? Quaternion.identity()
            : new Quaternion(this.x / length, this.y / length, this.z / length, this.w / length);
    }

    public multiply(right: Quaternion): Quaternion {
        return new Quaternion(
            this.w * right.x + this.x * right.w + this.y * right.z - this.z * right.y,
            this.w * right.y - this.x * right.z + this.y * right.w + this.z * right.x,
            this.w * right.z + this.x * right.y - this.y * right.x + this.z * right.w,
            this.w * right.w - this.x * right.x - this.y * right.y - this.z * right.z,
        );
    }

    public rotateVector(vector: Vector3): Vec3 {
        const q = this.normalize();
        const u = Vec3.of(q.x, q.y, q.z);
        const s = q.w;
        const uv = u.cross(vector);
        const uuv = u.cross(uv);

        return Vec3.from(vector)
            .add(uv.scale(2 * s))
            .add(uuv.scale(2));
    }

    public static identity(): Quaternion {
        return new Quaternion(0, 0, 0, 1);
    }

    public static fromAxisAngle(axis: Vector3, radians: number): Quaternion {
        const unitAxis = Vec3.from(axis).normalize();
        const half = radians / 2;
        const sin = Math.sin(half);

        return new Quaternion(unitAxis.x * sin, unitAxis.y * sin, unitAxis.z * sin, Math.cos(half));
    }
}
