import type { Vector3 } from '@occt-draw/math';
import type { LineVertex } from './types';

export function appendGrid(vertices: LineVertex[], size: number, divisions: number): void {
    const halfSize = size / 2;
    const step = size / divisions;
    const color = vector3(0.24, 0.3, 0.36);

    for (let index = 0; index <= divisions; index += 1) {
        const offset = -halfSize + index * step;
        const lineColor = index === divisions / 2 ? vector3(0.42, 0.49, 0.58) : color;

        appendLine(
            vertices,
            vector3(-halfSize, 0, offset),
            vector3(halfSize, 0, offset),
            lineColor,
        );
        appendLine(
            vertices,
            vector3(offset, 0, -halfSize),
            vector3(offset, 0, halfSize),
            lineColor,
        );
    }
}

function appendLine(vertices: LineVertex[], start: Vector3, end: Vector3, color: Vector3): void {
    vertices.push({ position: start, color }, { position: end, color });
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
