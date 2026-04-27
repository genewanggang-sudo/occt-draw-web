import type { Point3, Vector3 } from '@occt-draw/math';
import type { FeatureId } from './ids';

export type FeatureKind = 'placeholder' | 'sketch';
export type FeatureStatus = 'ready' | 'suppressed';
export type SketchPlaneKind = 'xy';

export interface BaseFeature {
    readonly id: FeatureId;
    readonly kind: FeatureKind;
    readonly name: string;
    readonly status: FeatureStatus;
    readonly suppressed: boolean;
}

export interface PlaceholderFeature extends BaseFeature {
    readonly kind: 'placeholder';
}

export interface SketchPlane {
    readonly kind: SketchPlaneKind;
    readonly normal: Vector3;
    readonly origin: Point3;
    readonly xAxis: Vector3;
}

export interface SketchFeatureData {
    readonly plane: SketchPlane;
}

export interface SketchFeature extends BaseFeature {
    readonly kind: 'sketch';
    readonly sketch: SketchFeatureData;
}

export type Feature = PlaceholderFeature | SketchFeature;
