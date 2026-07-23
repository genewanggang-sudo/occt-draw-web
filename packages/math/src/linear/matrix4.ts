import { Vec3, type Vector3 } from './vec3';
import { Vec3ResultPayloadSnapshotter } from './vec3ResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';

export class Matrix4 {
    private readonly values: Float32Array;

    constructor(elements?: ArrayLike<number>) {
        this.values = new Float32Array(elements ?? Matrix4.identityElements());
    }

    public get elements(): Float32Array {
        return new Float32Array(this.values);
    }

    public clone(): Matrix4 {
        return new Matrix4(this.values);
    }

    public multiply(right: Matrix4): Matrix4 {
        const left = this.values;
        const rightElements = right.values;
        const result = new Float32Array(16);

        for (let row = 0; row < 4; row += 1) {
            for (let column = 0; column < 4; column += 1) {
                result[column * 4 + row] =
                    Matrix4.get(left, 0, row) * Matrix4.get(rightElements, column, 0) +
                    Matrix4.get(left, 1, row) * Matrix4.get(rightElements, column, 1) +
                    Matrix4.get(left, 2, row) * Matrix4.get(rightElements, column, 2) +
                    Matrix4.get(left, 3, row) * Matrix4.get(rightElements, column, 3);
            }
        }

        return new Matrix4(result);
    }

    public transformPoint(point: Vector3): Vec3 {
        const result = this.transformPointResult(point);

        if (!result.value) {
            throw new Error('Matrix4 transformPoint failed: degenerate homogeneous coordinate');
        }

        return result.value;
    }

    public transformPointResult(point: Vector3): GeometryResult<Vec3> {
        if (!Vec3.from(point).isFinite()) {
            return GeometryResult.degenerate();
        }

        const x = point.x;
        const y = point.y;
        const z = point.z;
        const w =
            Matrix4.get(this.values, 0, 3) * x +
            Matrix4.get(this.values, 1, 3) * y +
            Matrix4.get(this.values, 2, 3) * z +
            Matrix4.get(this.values, 3, 3);

        if (Math.abs(w) <= MATH_EPSILON) {
            return GeometryResult.degenerate();
        }

        return GeometryResult.success(
            Vec3.of(
                (Matrix4.get(this.values, 0, 0) * x +
                    Matrix4.get(this.values, 1, 0) * y +
                    Matrix4.get(this.values, 2, 0) * z +
                    Matrix4.get(this.values, 3, 0)) /
                    w,
                (Matrix4.get(this.values, 0, 1) * x +
                    Matrix4.get(this.values, 1, 1) * y +
                    Matrix4.get(this.values, 2, 1) * z +
                    Matrix4.get(this.values, 3, 1)) /
                    w,
                (Matrix4.get(this.values, 0, 2) * x +
                    Matrix4.get(this.values, 1, 2) * y +
                    Matrix4.get(this.values, 2, 2) * z +
                    Matrix4.get(this.values, 3, 2)) /
                    w,
            ),
            new Vec3ResultPayloadSnapshotter(),
        );
    }

    public transformVector(vector: Vector3): Vec3 {
        const x = vector.x;
        const y = vector.y;
        const z = vector.z;

        return Vec3.of(
            Matrix4.get(this.values, 0, 0) * x +
                Matrix4.get(this.values, 1, 0) * y +
                Matrix4.get(this.values, 2, 0) * z,
            Matrix4.get(this.values, 0, 1) * x +
                Matrix4.get(this.values, 1, 1) * y +
                Matrix4.get(this.values, 2, 1) * z,
            Matrix4.get(this.values, 0, 2) * x +
                Matrix4.get(this.values, 1, 2) * y +
                Matrix4.get(this.values, 2, 2) * z,
        );
    }

    public static identity(): Matrix4 {
        return new Matrix4();
    }

    public static translation(offset: Vector3): Matrix4 {
        return new Matrix4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, offset.x, offset.y, offset.z, 1]);
    }

    public static rotationX(radians: number): Matrix4 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return new Matrix4([1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1]);
    }

    public static rotationY(radians: number): Matrix4 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return new Matrix4([cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1]);
    }

    public static rotationZ(radians: number): Matrix4 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return new Matrix4([cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }

    public static scale(scale: Vector3): Matrix4 {
        return new Matrix4([scale.x, 0, 0, 0, 0, scale.y, 0, 0, 0, 0, scale.z, 0, 0, 0, 0, 1]);
    }

    public toFloat32Array(): Float32Array {
        return new Float32Array(this.values);
    }

    private static identityElements(): readonly number[] {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }

    private static get(elements: ArrayLike<number>, column: number, row: number): number {
        const value = elements[column * 4 + row];

        if (value === undefined) {
            throw new Error(`Matrix4 index out of range: ${String(column)},${String(row)}`);
        }

        return value;
    }
}
