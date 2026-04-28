import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type DisplayObjectId = string;
export type DisplayObjectKind =
    | 'label-batch'
    | 'line-batch'
    | 'marker-batch'
    | 'point-batch'
    | 'surface-batch';
export type LabelBaseline = 'alphabetic' | 'hanging' | 'ideographic' | 'middle';
export type LabelFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type LabelHorizontalJustify = 'center' | 'left' | 'right';
export type LabelText = 'Front' | 'Right' | 'Top';
export type LabelVerticalJustify = 'baseline' | 'bottom' | 'middle' | 'top';
export type MarkerShape = 'origin';

export interface BaseDisplayObject {
    readonly id: DisplayObjectId;
    readonly kind: DisplayObjectKind;
    readonly name: string;
    readonly visible: boolean;
}

export interface LabelFrame {
    readonly origin: Vector3;
    readonly xAxis: Vector3;
    readonly yAxis: Vector3;
}

export interface LabelInsert {
    readonly x: number;
    readonly y: number;
}

export interface LabelJustify {
    readonly baseline: LabelBaseline;
    readonly horizontal: LabelHorizontalJustify;
    readonly vertical: LabelVerticalJustify;
}

export interface LabelPaddingPixels {
    readonly x: number;
    readonly y: number;
}

export interface LabelDisplayItem {
    readonly color: Vector3;
    readonly fontWeight?: LabelFontWeight;
    readonly frame: LabelFrame;
    readonly heightPixels: number;
    readonly insert: LabelInsert;
    readonly justify: LabelJustify;
    readonly paddingPixels?: LabelPaddingPixels;
    readonly text: LabelText;
}

export interface LabelBatchDisplayObject extends BaseDisplayObject {
    readonly kind: 'label-batch';
    readonly labels: readonly LabelDisplayItem[];
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
    | LabelBatchDisplayObject
    | LineBatchDisplayObject
    | MarkerBatchDisplayObject
    | PointBatchDisplayObject
    | SurfaceBatchDisplayObject;

export interface DisplayModel {
    readonly id: string;
    readonly name: string;
    readonly objects: readonly DisplayObject[];
}
