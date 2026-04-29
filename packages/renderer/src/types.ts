import type { DisplayModel } from '@occt-draw/display';
import type { Vector3 } from '@occt-draw/math';

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
    readonly displayModel: DisplayModel;
    readonly highlight: RenderHighlightState;
    readonly viewportSize: ViewportSize;
}

export interface RenderHighlightState {
    readonly hoveredObjectId: string | null;
    readonly preselectedObjectId: string | null;
    readonly preselectedPrimitiveId: string | null;
    readonly selectedObjectIds: readonly string[];
    readonly selectedPrimitiveId: string | null;
}

export interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

export interface ScreenRect {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
}

export type NavigationDepthRole = 'model' | 'reference-plane';

export type NavigationDepthSamplingArea =
    | {
          readonly kind: 'points';
          readonly points: readonly ScreenPoint2[];
      }
    | {
          readonly kind: 'rect';
          readonly rect: ScreenRect;
          readonly stepPixels: number;
      };

export interface NavigationDepthSampleInput {
    readonly area: NavigationDepthSamplingArea;
    readonly camera: CameraState;
    readonly displayModel: DisplayModel;
    readonly includePlanes: boolean;
    readonly viewportSize: ViewportSize;
}

export interface NavigationDepthSample {
    readonly canvasPoint: ScreenPoint2;
    readonly depth01: number;
    readonly role: NavigationDepthRole;
    readonly viewDepth: number;
    readonly worldPoint: Vector3;
}

export interface CadRenderer {
    dispose(): void;
    render(input: RenderFrameInput): void;
    resize(viewportSize: ViewportSize): void;
    sampleNavigationDepths(input: NavigationDepthSampleInput): readonly NavigationDepthSample[];
}
