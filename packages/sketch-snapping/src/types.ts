import type { Plane3, Vector2, Vector3 } from '@occt-draw/math';
import type { Sketch, SketchEntityRef } from '@occt-draw/sketch';
import type { CameraState, ScreenPoint2, ViewportSize } from '@occt-draw/webgl-engine';

export type SketchSnapKind = 'vertex' | 'midpoint' | 'edge-nearest';

export interface SketchSnapInput {
    readonly camera: CameraState;
    readonly enabledKinds: readonly SketchSnapKind[];
    readonly excludedRefs?: readonly SketchEntityRef[];
    readonly plane: Plane3;
    readonly pointerPoint: ScreenPoint2;
    readonly rawSketchPoint: Vector2;
    readonly sketch: Sketch;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export interface SketchSnapCandidate {
    readonly distancePixels: number;
    readonly kind: SketchSnapKind;
    readonly point: Vector2;
    readonly priority: number;
    readonly sourceRef?: SketchEntityRef;
    readonly stableId: string;
    readonly worldPoint: Vector3;
}

export interface SketchSnapResult {
    readonly distancePixels: number;
    readonly kind: SketchSnapKind;
    readonly point: Vector2;
    readonly sourceRef?: SketchEntityRef;
    readonly worldPoint: Vector3;
}
