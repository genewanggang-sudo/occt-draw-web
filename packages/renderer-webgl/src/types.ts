import type { Vector3 } from '@occt-draw/math';

export interface Vector2 {
    readonly x: number;
    readonly y: number;
}

export interface RenderVertex {
    readonly alpha: number;
    readonly color: Vector3;
    readonly position: Vector3;
}

export interface LabelVertex extends RenderVertex {
    readonly uv: Vector2;
}

export interface MarkerVertex extends RenderVertex {
    readonly sizePixels: number;
}

export type LineVertex = RenderVertex;

export type Matrix4 = Float32Array;
