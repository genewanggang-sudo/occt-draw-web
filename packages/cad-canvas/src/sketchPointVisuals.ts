import { Vec3 } from '@occt-draw/math';

export const ON_SHAPE_FREE_SKETCH_POINT_COLOR = Vec3.of(61 / 255, 124 / 255, 204 / 255);
export const ON_SHAPE_FREE_SKETCH_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 2,
    ringFillPercent: 50,
} as const;
export const ON_SHAPE_FREE_SKETCH_POINT_SIZE_PX = 8;

export const ON_SHAPE_REFERENCE_ORIGIN_POINT_COLOR = Vec3.of(1, 1, 1);
export const ON_SHAPE_REFERENCE_ORIGIN_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 3,
    ringFillPercent: 50,
} as const;
export const ON_SHAPE_REFERENCE_ORIGIN_POINT_SIZE_PX = 10;

export const ON_SHAPE_SKETCH_VERTEX_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 1,
    ringFillPercent: 50,
} as const;
export const ON_SHAPE_SKETCH_VERTEX_POINT_SIZE_PX = 6;
