import {
    Circle2,
    sampleCurveSegments2,
    type CurveSegmentSamplingOptions,
    type LineSegment2,
    type Vector2,
} from '@occt-draw/math';
import { Circle2D, type Curve2D } from './geometry';

const DEFAULT_SKETCH_CURVE_SEGMENTS = 64;

export interface SketchCircleSamplingInput {
    readonly center: Vector2;
    readonly kind: 'circle';
    readonly radius: number;
}

export type SketchCurveSamplingInput = Curve2D | SketchCircleSamplingInput;

export interface SketchCurveSegmentSamplingOptions {
    readonly segments?: number;
}

export function sampleSketchCurveSegments(
    input: SketchCurveSamplingInput,
    options: SketchCurveSegmentSamplingOptions = {},
): readonly LineSegment2[] {
    const segmentOptions: CurveSegmentSamplingOptions = {
        closed: true,
        segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
    };

    if (input instanceof Circle2D || isCircleSamplingInput(input)) {
        return sampleCurveSegments2(new Circle2(input.center, input.radius), segmentOptions);
    }

    return [];
}

function isCircleSamplingInput(
    input: SketchCurveSamplingInput,
): input is SketchCircleSamplingInput {
    return input.kind === 'circle' && 'center' in input && 'radius' in input;
}
