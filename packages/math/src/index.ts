export type MathModuleStatus = 'ready';

export interface MathModuleManifest {
    readonly name: '@occt-draw/math';
    readonly status: MathModuleStatus;
    readonly summary: string;
}

export interface Vector3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export const MATH_EPSILON = 1e-8;

export const MATH_MODULE_MANIFEST: MathModuleManifest = {
    name: '@occt-draw/math',
    status: 'ready',
    summary: '三维向量、矩阵、射线、平面、包围盒和 CAD 数值容差的基础数学包。',
};

export function getMathModuleManifest(): MathModuleManifest {
    return MATH_MODULE_MANIFEST;
}

export function createVector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}

export function addVector3(left: Vector3, right: Vector3): Vector3 {
    return createVector3(left.x + right.x, left.y + right.y, left.z + right.z);
}

export function clampNumber(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function subtractVector3(left: Vector3, right: Vector3): Vector3 {
    return createVector3(left.x - right.x, left.y - right.y, left.z - right.z);
}

export function scaleVector3(vector: Vector3, scale: number): Vector3 {
    return createVector3(vector.x * scale, vector.y * scale, vector.z * scale);
}

export function dotVector3(left: Vector3, right: Vector3): number {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function crossVector3(left: Vector3, right: Vector3): Vector3 {
    return createVector3(
        left.y * right.z - left.z * right.y,
        left.z * right.x - left.x * right.z,
        left.x * right.y - left.y * right.x,
    );
}

export function lengthVector3(vector: Vector3): number {
    return Math.hypot(vector.x, vector.y, vector.z);
}

export function distanceVector3(left: Vector3, right: Vector3): number {
    return lengthVector3(subtractVector3(left, right));
}

export function normalizeVector3(vector: Vector3): Vector3 {
    const length = lengthVector3(vector);

    if (length <= MATH_EPSILON) {
        return createVector3(0, 0, 0);
    }

    return scaleVector3(vector, 1 / length);
}

export function rotateVectorAroundAxis(vector: Vector3, axis: Vector3, radians: number): Vector3 {
    const unitAxis = normalizeVector3(axis);

    if (lengthVector3(unitAxis) <= MATH_EPSILON) {
        return vector;
    }

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const parallel = scaleVector3(unitAxis, dotVector3(unitAxis, vector) * (1 - cos));
    const perpendicular = scaleVector3(vector, cos);
    const tangent = scaleVector3(crossVector3(unitAxis, vector), sin);

    return addVector3(addVector3(perpendicular, tangent), parallel);
}
