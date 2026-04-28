import type { Vector3 } from '@occt-draw/math';

export interface RenderVertex {
    readonly alpha: number;
    readonly color: Vector3;
    readonly position: Vector3;
}

export type LineVertex = RenderVertex;

export type Matrix4 = Float32Array;
