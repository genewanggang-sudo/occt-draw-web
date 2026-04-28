import type { Vector3 } from '@occt-draw/math';
import type { LineVertex } from './types';

export function appendAxis(vertices: LineVertex[], length: number): void {
    appendLine(vertices, vector3(0, 0, 0), vector3(length, 0, 0), vector3(0.95, 0.2, 0.18));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, length, 0), vector3(0.2, 0.8, 0.32));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, 0, length), vector3(0.28, 0.55, 1));
}

function appendLine(vertices: LineVertex[], start: Vector3, end: Vector3, color: Vector3): void {
    vertices.push({ position: start, color, alpha: 1 }, { position: end, color, alpha: 1 });
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
