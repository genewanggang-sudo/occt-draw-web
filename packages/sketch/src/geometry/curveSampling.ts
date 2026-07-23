import {
    Circle2,
    CurveTessellator2,
    type CurveTessellationOptions,
    type LineSegment2,
    type Vector2,
} from '@occt-draw/math';
import {
    Arc2D,
    Circle2D,
    Conic2D,
    Ellipse2D,
    EllipticalArc2D,
    Spline2D,
    type Curve2D,
} from './geometry';

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
    const segmentOptions: CurveTessellationOptions = {
        closed: true,
        segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
    };

    if (input instanceof Circle2D || isCircleSamplingInput(input)) {
        return CurveTessellator2.tessellate(
            new Circle2(input.center, input.radius),
            segmentOptions,
        );
    }

    if (input instanceof Ellipse2D) {
        return CurveTessellator2.tessellate(input.ellipse, segmentOptions);
    }

    if (input instanceof Arc2D) {
        return CurveTessellator2.tessellate(input.arc, {
            closed: false,
            segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
        });
    }

    if (input instanceof EllipticalArc2D) {
        return CurveTessellator2.tessellate(input.arc, {
            closed: false,
            segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
        });
    }

    if (input instanceof Conic2D) {
        return CurveTessellator2.tessellate(input.conic, {
            closed: false,
            segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
        });
    }

    if (input instanceof Spline2D) {
        const spline = input.fitSpline;

        return spline
            ? CurveTessellator2.tessellate(spline, {
                  closed: input.closed,
                  segments: options.segments ?? DEFAULT_SKETCH_CURVE_SEGMENTS,
              })
            : [];
    }

    return [];
}

function isCircleSamplingInput(
    input: SketchCurveSamplingInput,
): input is SketchCircleSamplingInput {
    return input.kind === 'circle' && 'center' in input && 'radius' in input;
}
