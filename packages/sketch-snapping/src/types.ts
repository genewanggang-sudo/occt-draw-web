import type { Vector2, Vector3 } from '@occt-draw/math';

export type SketchSnapKind = 'vertex' | 'midpoint' | 'edge-nearest';

export interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

export interface SketchSnapInput<TSourceRef = unknown> {
    readonly candidates: readonly SketchSnapSource<TSourceRef>[];
    readonly enabledKinds: readonly SketchSnapKind[];
    readonly pointerPoint: ScreenPoint2;
    readonly rawSketchPoint: Vector2;
    readonly thresholdPixels: number;
}

export interface SketchSnapSource<TSourceRef = unknown> {
    readonly kind: SketchSnapKind;
    readonly point: Vector2;
    readonly priority?: number;
    readonly screenPoint: ScreenPoint2;
    readonly sourceRef?: TSourceRef;
    readonly stableId: string;
    readonly worldPoint: Vector3;
}

export interface SketchSnapCandidate<TSourceRef = unknown> {
    readonly distancePixels: number;
    readonly kind: SketchSnapKind;
    readonly point: Vector2;
    readonly priority: number;
    readonly sourceRef?: TSourceRef;
    readonly stableId: string;
    readonly worldPoint: Vector3;
}

export interface SketchSnapResult<TSourceRef = unknown> {
    readonly distancePixels: number;
    readonly kind: SketchSnapKind;
    readonly point: Vector2;
    readonly sourceRef?: TSourceRef;
    readonly worldPoint: Vector3;
}
