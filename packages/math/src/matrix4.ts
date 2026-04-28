import type { Vector3 } from './vector3';
import { Point3, Vec3 } from './vector3';

export class Matrix4 {
    public readonly elements: Float32Array;

    constructor(elements?: ArrayLike<number>) {
        this.elements = new Float32Array(elements ?? Matrix4.createIdentityElements());
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
                result[row * 4 + column] =
                    Matrix4.getElement(left, row * 4) * Matrix4.getElement(rightElements, column) +
                    Matrix4.getElement(left, row * 4 + 1) *
                        Matrix4.getElement(rightElements, column + 4) +
                    Matrix4.getElement(left, row * 4 + 2) *
                        Matrix4.getElement(rightElements, column + 8) +
                    Matrix4.getElement(left, row * 4 + 3) *
                        Matrix4.getElement(rightElements, column + 12);
            }
        }

        return new Matrix4(result);
    }

    public transformPoint(point: Vector3): Point3 {
        const element = this.elements;
        const x = point.x;
        const y = point.y;
        const z = point.z;
        const w =
            Matrix4.getElement(element, 3) * x +
            Matrix4.getElement(element, 7) * y +
            Matrix4.getElement(element, 11) * z +
            Matrix4.getElement(element, 15);
        const safeW = Math.abs(w) > 1e-8 ? w : 1;

        return new Point3(
            (Matrix4.getElement(element, 0) * x +
                Matrix4.getElement(element, 4) * y +
                Matrix4.getElement(element, 8) * z +
                Matrix4.getElement(element, 12)) /
                safeW,
            (Matrix4.getElement(element, 1) * x +
                Matrix4.getElement(element, 5) * y +
                Matrix4.getElement(element, 9) * z +
                Matrix4.getElement(element, 13)) /
                safeW,
            (Matrix4.getElement(element, 2) * x +
                Matrix4.getElement(element, 6) * y +
                Matrix4.getElement(element, 10) * z +
                Matrix4.getElement(element, 14)) /
                safeW,
        );
    }

    public transformVector(vector: Vector3): Vec3 {
        const element = this.elements;
        const x = vector.x;
        const y = vector.y;
        const z = vector.z;

        return new Vec3(
            Matrix4.getElement(element, 0) * x +
                Matrix4.getElement(element, 4) * y +
                Matrix4.getElement(element, 8) * z,
            Matrix4.getElement(element, 1) * x +
                Matrix4.getElement(element, 5) * y +
                Matrix4.getElement(element, 9) * z,
            Matrix4.getElement(element, 2) * x +
                Matrix4.getElement(element, 6) * y +
                Matrix4.getElement(element, 10) * z,
        );
    }

    public static identity(): Matrix4 {
        return new Matrix4();
    }

    private static createIdentityElements(): readonly number[] {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }

    private static getElement(elements: ArrayLike<number>, index: number): number {
        const value = elements[index];

        if (value === undefined) {
            throw new Error(`矩阵索引越界：${index.toString()}`);
        }

        return value;
    }
}

export function createIdentityMatrix4(): Matrix4 {
    return Matrix4.identity();
}

export function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
    return left.multiply(right);
}

export function transformPoint3(matrix: Matrix4, point: Vector3): Point3 {
    return matrix.transformPoint(point);
}

export function transformVector3(matrix: Matrix4, vector: Vector3): Vec3 {
    return matrix.transformVector(vector);
}
