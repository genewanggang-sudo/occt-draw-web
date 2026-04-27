import type { Vector3 } from './vector3';
import { Point3, Vec3 } from './vector3';

export class Matrix4 {
    readonly elements: Float32Array;

    constructor(elements?: ArrayLike<number>) {
        this.elements = new Float32Array(elements ?? createIdentityElements());
    }

    clone(): Matrix4 {
        return new Matrix4(this.elements);
    }

    multiply(right: Matrix4): Matrix4 {
        const left = this.elements;
        const rightElements = right.elements;
        const result = new Float32Array(16);

        for (let row = 0; row < 4; row += 1) {
            for (let column = 0; column < 4; column += 1) {
                result[row * 4 + column] =
                    getElement(left, row * 4) * getElement(rightElements, column) +
                    getElement(left, row * 4 + 1) * getElement(rightElements, column + 4) +
                    getElement(left, row * 4 + 2) * getElement(rightElements, column + 8) +
                    getElement(left, row * 4 + 3) * getElement(rightElements, column + 12);
            }
        }

        return new Matrix4(result);
    }

    transformPoint(point: Vector3): Point3 {
        const element = this.elements;
        const x = point.x;
        const y = point.y;
        const z = point.z;
        const w =
            getElement(element, 3) * x +
            getElement(element, 7) * y +
            getElement(element, 11) * z +
            getElement(element, 15);
        const safeW = Math.abs(w) > 1e-8 ? w : 1;

        return new Point3(
            (getElement(element, 0) * x +
                getElement(element, 4) * y +
                getElement(element, 8) * z +
                getElement(element, 12)) /
                safeW,
            (getElement(element, 1) * x +
                getElement(element, 5) * y +
                getElement(element, 9) * z +
                getElement(element, 13)) /
                safeW,
            (getElement(element, 2) * x +
                getElement(element, 6) * y +
                getElement(element, 10) * z +
                getElement(element, 14)) /
                safeW,
        );
    }

    transformVector(vector: Vector3): Vec3 {
        const element = this.elements;
        const x = vector.x;
        const y = vector.y;
        const z = vector.z;

        return new Vec3(
            getElement(element, 0) * x + getElement(element, 4) * y + getElement(element, 8) * z,
            getElement(element, 1) * x + getElement(element, 5) * y + getElement(element, 9) * z,
            getElement(element, 2) * x + getElement(element, 6) * y + getElement(element, 10) * z,
        );
    }

    static identity(): Matrix4 {
        return new Matrix4();
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

function createIdentityElements(): readonly number[] {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function getElement(elements: ArrayLike<number>, index: number): number {
    const value = elements[index];

    if (value === undefined) {
        throw new Error(`矩阵索引越界：${index.toString()}`);
    }

    return value;
}
