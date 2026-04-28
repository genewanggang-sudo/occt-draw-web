import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type DisplayObjectId = string;
export type DisplayObjectKind =
    | 'axis'
    | 'cube-wireframe'
    | 'grid'
    | 'line-batch'
    | 'line-segments'
    | 'point-batch'
    | 'surface-batch';

export interface BaseDisplayObject {
    readonly id: DisplayObjectId;
    readonly kind: DisplayObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface AxisDisplayObject extends BaseDisplayObject {
    readonly kind: 'axis';
    readonly length: number;
}

export interface GridDisplayObject extends BaseDisplayObject {
    readonly divisions: number;
    readonly kind: 'grid';
    readonly size: number;
}

export interface CubeWireframeDisplayObject extends BaseDisplayObject {
    readonly center: Vector3;
    readonly kind: 'cube-wireframe';
    readonly size: number;
}

export interface LineSegmentsDisplayObject extends BaseDisplayObject {
    readonly color: Vector3;
    readonly kind: 'line-segments';
    readonly segments: readonly LineSegment3[];
}

export interface LineBatchDisplayObject extends BaseDisplayObject {
    readonly color: Vector3;
    readonly kind: 'line-batch';
    readonly segments: readonly LineSegment3[];
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
    | AxisDisplayObject
    | CubeWireframeDisplayObject
    | GridDisplayObject
    | LineBatchDisplayObject
    | LineSegmentsDisplayObject
    | PointBatchDisplayObject
    | SurfaceBatchDisplayObject;

export interface DisplayModel {
    readonly id: string;
    readonly name: string;
    readonly objects: readonly DisplayObject[];
}
