import { Vec2, type Vector2 } from './vec2';

export class Matrix3 {
    public readonly elements: Float32Array;

    constructor(elements?: ArrayLike<number>) {
        this.elements = new Float32Array(elements ?? Matrix3.identityElements());
    }

    public multiply(right: Matrix3): Matrix3 {
        const left = this.elements;
        const rightElements = right.elements;
        const result = new Float32Array(9);

        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                result[column * 3 + row] =
                    Matrix3.get(left, 0, row) * Matrix3.get(rightElements, column, 0) +
                    Matrix3.get(left, 1, row) * Matrix3.get(rightElements, column, 1) +
                    Matrix3.get(left, 2, row) * Matrix3.get(rightElements, column, 2);
            }
        }

        return new Matrix3(result);
    }

    public transformPoint(point: Vector2): Vec2 {
        const x = point.x;
        const y = point.y;
        const w = Matrix3.get(this.elements, 0, 2) * x + Matrix3.get(this.elements, 1, 2) * y + 1;
        const safeW = Math.abs(w) > 1e-8 ? w : 1;

        return Vec2.of(
            (Matrix3.get(this.elements, 0, 0) * x +
                Matrix3.get(this.elements, 1, 0) * y +
                Matrix3.get(this.elements, 2, 0)) /
                safeW,
            (Matrix3.get(this.elements, 0, 1) * x +
                Matrix3.get(this.elements, 1, 1) * y +
                Matrix3.get(this.elements, 2, 1)) /
                safeW,
        );
    }

    public transformVector(vector: Vector2): Vec2 {
        return Vec2.of(
            Matrix3.get(this.elements, 0, 0) * vector.x +
                Matrix3.get(this.elements, 1, 0) * vector.y,
            Matrix3.get(this.elements, 0, 1) * vector.x +
                Matrix3.get(this.elements, 1, 1) * vector.y,
        );
    }

    public static identity(): Matrix3 {
        return new Matrix3();
    }

    public static translation(offset: Vector2): Matrix3 {
        return new Matrix3([1, 0, 0, 0, 1, 0, offset.x, offset.y, 1]);
    }

    public static rotation(radians: number): Matrix3 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        return new Matrix3([cos, sin, 0, -sin, cos, 0, 0, 0, 1]);
    }

    public static scale(scale: Vector2): Matrix3 {
        return new Matrix3([scale.x, 0, 0, 0, scale.y, 0, 0, 0, 1]);
    }

    private static identityElements(): readonly number[] {
        return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    private static get(elements: ArrayLike<number>, column: number, row: number): number {
        const value = elements[column * 3 + row];

        if (value === undefined) {
            throw new Error(`二维矩阵索引越界：${String(column)},${String(row)}`);
        }

        return value;
    }
}
