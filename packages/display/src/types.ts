import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type DisplayObjectId = string;
export type DisplayObjectKind = 'axis' | 'cube-wireframe' | 'grid' | 'line-segments';

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

export type DisplayObject =
    | AxisDisplayObject
    | CubeWireframeDisplayObject
    | GridDisplayObject
    | LineSegmentsDisplayObject;

export interface DisplayModel {
    readonly id: string;
    readonly name: string;
    readonly objects: readonly DisplayObject[];
}
