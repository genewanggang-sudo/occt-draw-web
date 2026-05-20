import type { Vector2, Vector3 } from '@occt-draw/math';

export type SnapKind = 'vertex' | 'midpoint' | 'edge-nearest';

export interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

export interface SnapInput<TSourceRef = unknown> {
    readonly candidates: readonly SnapSource<TSourceRef>[];
    readonly enabledKinds: readonly SnapKind[];
    readonly pointerPoint: ScreenPoint2;
    readonly rawSketchPoint: Vector2;
    readonly thresholdPixels: number;
}

export interface SnapSource<TSourceRef = unknown> {
    readonly kind: SnapKind;
    readonly point: Vector2;
    readonly priority?: number;
    readonly screenPoint: ScreenPoint2;
    readonly sourceRef?: TSourceRef;
    readonly stableId: string;
    readonly worldPoint: Vector3;
}

export interface SnapCandidate<TSourceRef = unknown> {
    readonly distancePixels: number;
    readonly kind: SnapKind;
    readonly point: Vector2;
    readonly priority: number;
    readonly sourceRef?: TSourceRef;
    readonly stableId: string;
    readonly worldPoint: Vector3;
}

export interface SnapResult<TSourceRef = unknown> {
    readonly distancePixels: number;
    readonly kind: SnapKind;
    readonly point: Vector2;
    readonly sourceRef?: TSourceRef;
    readonly worldPoint: Vector3;
}
