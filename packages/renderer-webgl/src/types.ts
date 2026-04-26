import type { Vector3 } from '@occt-draw/math';

export interface LineVertex {
    readonly color: Vector3;
    readonly position: Vector3;
}

export type Matrix4 = Float32Array;
