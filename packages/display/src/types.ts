import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type DisplayObjectId = string;
export type DisplayObjectKind = 'line-batch' | 'marker-batch' | 'point-batch' | 'surface-batch';
export type MarkerShape = 'origin';

export interface BaseDisplayObject {
    readonly id: DisplayObjectId;
    readonly kind: DisplayObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface LineBatchDisplayObject extends BaseDisplayObject {
    readonly color: Vector3;
    readonly kind: 'line-batch';
    readonly segments: readonly LineSegment3[];
}

export interface MarkerDisplayItem {
    readonly color: Vector3;
    readonly position: Vector3;
    readonly shape: MarkerShape;
    readonly sizePixels: number;
}

export interface MarkerBatchDisplayObject extends BaseDisplayObject {
    readonly kind: 'marker-batch';
    readonly markers: readonly MarkerDisplayItem[];
}

export interface PointBatchDisplayObject extends BaseDisplayObject {
    readonly color: Vector3;
    readonly kind: 'point-batch';
    readonly points: readonly Vector3[];
    readonly sizePixels: number;
}

export interface SurfaceTriangle {
    readonly a: Vector3;
    readonly b: Vector3;
    readonly c: Vector3;
}

export interface SurfaceBatchDisplayObject extends BaseDisplayObject {
    readonly color: Vector3;
    readonly kind: 'surface-batch';
    readonly opacity: number;
    readonly triangles: readonly SurfaceTriangle[];
}

export type DisplayObject =
    | LineBatchDisplayObject
    | MarkerBatchDisplayObject
    | PointBatchDisplayObject
    | SurfaceBatchDisplayObject;

export interface DisplayModel {
    readonly id: string;
    readonly name: string;
    readonly objects: readonly DisplayObject[];
}
