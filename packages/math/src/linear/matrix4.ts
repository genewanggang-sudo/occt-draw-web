import { Vec3, type Vector3 } from './vec3';

export class Matrix4 {
    public readonly elements: Float32Array;

    constructor(elements?: ArrayLike<number>) {
        this.elements = new Float32Array(elements ?? Matrix4.identityElements());
    }

    public clone(): Matrix4 {
        return new Matrix4(this.elements);
    }

    public multiply(right: Matrix4): Matrix4 {
        const left = this.elements;
        const rightElements = right.elements;
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
        const x = point.x;
        const y = point.y;
        const z = point.z;
        const w =
            Matrix4.get(this.elements, 0, 3) * x +
            Matrix4.get(this.elements, 1, 3) * y +
            Matrix4.get(this.elements, 2, 3) * z +
            Matrix4.get(this.elements, 3, 3);
        const safeW = Math.abs(w) > 1e-8 ? w : 1;

        return Vec3.of(
            (Matrix4.get(this.elements, 0, 0) * x +
                Matrix4.get(this.elements, 1, 0) * y +
                Matrix4.get(this.elements, 2, 0) * z +
                Matrix4.get(this.elements, 3, 0)) /
                safeW,
            (Matrix4.get(this.elements, 0, 1) * x +
                Matrix4.get(this.elements, 1, 1) * y +
                Matrix4.get(this.elements, 2, 1) * z +
                Matrix4.get(this.elements, 3, 1)) /
                safeW,
            (Matrix4.get(this.elements, 0, 2) * x +
                Matrix4.get(this.elements, 1, 2) * y +
                Matrix4.get(this.elements, 2, 2) * z +
                Matrix4.get(this.elements, 3, 2)) /
                safeW,
        );
    }

    public transformVector(vector: Vector3): Vec3 {
        const x = vector.x;
        const y = vector.y;
        const z = vector.z;

        return Vec3.of(
            Matrix4.get(this.elements, 0, 0) * x +
                Matrix4.get(this.elements, 1, 0) * y +
                Matrix4.get(this.elements, 2, 0) * z,
            Matrix4.get(this.elements, 0, 1) * x +
                Matrix4.get(this.elements, 1, 1) * y +
                Matrix4.get(this.elements, 2, 1) * z,
            Matrix4.get(this.elements, 0, 2) * x +
                Matrix4.get(this.elements, 1, 2) * y +
                Matrix4.get(this.elements, 2, 2) * z,
        );
    }

    public static identity(): Matrix4 {
        return new Matrix4();
    }

    public static translation(offset: Vector3): Matrix4 {
        return new Matrix4([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, offset.x, offset.y, offset.z, 1]);
    }

    public static scale(scale: Vector3): Matrix4 {
        return new Matrix4([scale.x, 0, 0, 0, 0, scale.y, 0, 0, 0, 0, scale.z, 0, 0, 0, 0, 1]);
    }

    private static identityElements(): readonly number[] {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }

    private static get(elements: ArrayLike<number>, column: number, row: number): number {
        const value = elements[column * 4 + row];

        if (value === undefined) {
            throw new Error(`三维矩阵索引越界：${String(column)},${String(row)}`);
        }

        return value;
    }
}
