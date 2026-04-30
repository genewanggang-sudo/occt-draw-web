import { crossVector3, normalizeVector3, subtractVector3, type Vector3 } from '@occt-draw/math';
import type { CameraState, ViewportSize } from './types';
import type { Matrix4 } from './types';

export function createViewProjectionMatrix(
    camera: CameraState,
    viewportSize: ViewportSize,
): Matrix4 {
    return multiplyMatrix4(createProjectionMatrix(camera, viewportSize), lookAtMatrix4(camera));
}

function createProjectionMatrix(camera: CameraState, viewportSize: ViewportSize): Matrix4 {
    const aspect = viewportSize.width / viewportSize.height;

    if (camera.projection === 'orthographic') {
        return orthographicMatrix4(camera.orthographicHeight, aspect, camera.near, camera.far);
    }

    return perspectiveMatrix4(camera.fovYRadians, aspect, camera.near, camera.far);
}

function orthographicMatrix4(height: number, aspect: number, near: number, far: number): Matrix4 {
    const halfHeight = height / 2;
    const halfWidth = halfHeight * aspect;
    const left = -halfWidth;
    const right = halfWidth;
    const bottom = -halfHeight;
    const top = halfHeight;

    return new Float32Array([
        2 / (right - left),
        0,
        0,
        0,
        0,
        2 / (top - bottom),
        0,
        0,
        0,
        0,
        2 / (near - far),
        0,
        (left + right) / (left - right),
        (bottom + top) / (bottom - top),
        (near + far) / (near - far),
        1,
    ]);
}

function perspectiveMatrix4(
    fovYRadians: number,
    aspect: number,
    near: number,
    far: number,
): Matrix4 {
    const f = 1 / Math.tan(fovYRadians / 2);
    const rangeInverse = 1 / (near - far);

    return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (near + far) * rangeInverse,
        -1,
        0,
        0,
        near * far * rangeInverse * 2,
        0,
    ]);
}

function lookAtMatrix4(camera: CameraState): Matrix4 {
    const zAxis = normalizeVector3(subtractVector3(camera.position, camera.target));
    const xAxis = normalizeVector3(crossVector3(camera.up, zAxis));
    const yAxis = crossVector3(zAxis, xAxis);

    return new Float32Array([
        xAxis.x,
        yAxis.x,
        zAxis.x,
        0,
        xAxis.y,
        yAxis.y,
        zAxis.y,
        0,
        xAxis.z,
        yAxis.z,
        zAxis.z,
        0,
        -dot(xAxis, camera.position),
        -dot(yAxis, camera.position),
        -dot(zAxis, camera.position),
        1,
    ]);
}

function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
    const output = new Float32Array(16);

    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            output[column * 4 + row] =
                matrixValue(left, row) * matrixValue(right, column * 4) +
                matrixValue(left, 4 + row) * matrixValue(right, column * 4 + 1) +
                matrixValue(left, 8 + row) * matrixValue(right, column * 4 + 2) +
                matrixValue(left, 12 + row) * matrixValue(right, column * 4 + 3);
        }
    }

    return output;
}

function matrixValue(matrix: Matrix4, index: number): number {
    return matrix[index] ?? 0;
}

function dot(left: Vector3, right: Vector3): number {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}
