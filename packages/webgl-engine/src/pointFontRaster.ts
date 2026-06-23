export interface PointFontRasterInput {
    readonly angularSegmentCount: number;
    readonly distanceFromCenter: number;
    readonly filterWidth: number;
    readonly pointRadius: number;
    readonly radialSegmentCount: number;
    readonly ringFillPercent: number;
}

export interface PointFontRasterResult {
    readonly colorScale: number;
    readonly opacityScale: number;
}

export const ONSHAPE_SKETCH_USER_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 2,
    ringFillPercent: 50,
} as const;

export const ONSHAPE_SKETCH_USER_POINT_SIZE_PX = 8;

export const ONSHAPE_ORIGIN_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 3,
    ringFillPercent: 50,
} as const;

export const ONSHAPE_ORIGIN_POINT_SIZE_PX = 10;

export function evaluatePointFontRaster(input: PointFontRasterInput): PointFontRasterResult {
    const radialSegmentCount = Math.round(input.radialSegmentCount);
    const angularSegmentCount = Math.round(input.angularSegmentCount);
    const ringFont = clamp(input.ringFillPercent / 100, 0, 1);
    let radialOpacity = 0;
    let radialColorMix = 0;

    if (radialSegmentCount > 0) {
        const radialStep = input.pointRadius / radialSegmentCount;
        const closestIndex = clamp(
            Math.round(input.distanceFromCenter / radialStep),
            1,
            radialSegmentCount,
        );
        const closestBoundary = closestIndex * radialStep;
        const flip = 2 * modulo(radialSegmentCount - closestIndex, 2) - 1;
        const fontAdjustment =
            (input.pointRadius / Math.max(radialSegmentCount, 1)) *
            (ringFont - 0.5) *
            2 *
            Math.min(radialSegmentCount, 1);
        const radialValue = smoothstep(
            -input.filterWidth,
            input.filterWidth,
            2 * (flip * (input.distanceFromCenter - closestBoundary) + fontAdjustment),
        );
        const isInside = clamp(radialSegmentCount - closestIndex, 0, 1);

        radialOpacity = mix(radialValue, 1, isInside);
        radialColorMix = mix(1, radialValue, isInside);
    }

    const perimeterOpacity = smoothstep(
        -input.filterWidth,
        0,
        input.pointRadius - input.distanceFromCenter,
    );
    const opacityScale = Math.min(perimeterOpacity, Math.max(0, radialOpacity));
    const colorScale = Math.max(0, radialColorMix);
    const isEmpty = radialSegmentCount + angularSegmentCount === 0 ? 1 : 0;

    // Angular fonts are not needed for the current sketch point baseline.
    return {
        colorScale: Math.max(colorScale, isEmpty),
        opacityScale: Math.max(opacityScale, isEmpty),
    };
}

export function evaluatePointFontOpacity(input: PointFontRasterInput): number {
    return evaluatePointFontRaster(input).opacityScale;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);

    return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
    return a * (1 - t) + b * t;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function modulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
}
