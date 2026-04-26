import type { Vector3 } from '@occt-draw/math';
import type { SceneDocument } from '@occt-draw/scene';

export type CameraProjection = 'orthographic' | 'perspective';

export interface ViewportSize {
    readonly height: number;
    readonly width: number;
}

export interface BoundingBox3 {
    readonly max: Vector3;
    readonly min: Vector3;
}

export interface BoundingSphere {
    readonly center: Vector3;
    readonly radius: number;
}

export interface CameraState {
    readonly far: number;
    readonly fovYRadians: number;
    readonly near: number;
    readonly orthographicHeight: number;
    readonly position: Vector3;
    readonly projection: CameraProjection;
    readonly target: Vector3;
    readonly up: Vector3;
}

export interface RenderFrameInput {
    readonly camera: CameraState;
    readonly scene: SceneDocument;
    readonly viewportSize: ViewportSize;
}

export interface CadRenderer {
    dispose(): void;
    render(input: RenderFrameInput): void;
    resize(viewportSize: ViewportSize): void;
}
