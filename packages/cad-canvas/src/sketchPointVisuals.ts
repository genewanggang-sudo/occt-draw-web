import { Vec3 } from '@occt-draw/math';

export const ON_SHAPE_CONSTRUCTION_PLANE_FILL_COLOR = Vec3.of(206 / 255, 219 / 255, 229 / 255);
export const ON_SHAPE_CONSTRUCTION_PLANE_LABEL_COLOR = Vec3.of(22 / 255, 81 / 255, 176 / 255);
// Onshape uses #1d60aa59 for plane outlines. Edges are opaque in our current
// Canvas API, so use the white-background premultiplied equivalent.
export const ON_SHAPE_CONSTRUCTION_PLANE_OUTLINE_COLOR = Vec3.of(176 / 255, 199 / 255, 225 / 255);

export const ON_SHAPE_SKETCH_PLANE_COLOR = Vec3.of(144 / 255, 206 / 255, 241 / 255);
export const ON_SHAPE_SKETCH_PREVIEW_COLOR = Vec3.of(68 / 255, 156 / 255, 205 / 255);
export const ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR = Vec3.of(0, 0, 208 / 255);
export const ON_SHAPE_SKETCH_INACTIVE_COLOR = Vec3.of(153 / 255, 153 / 255, 153 / 255);

export const ON_SHAPE_FREE_SKETCH_POINT_COLOR = ON_SHAPE_SKETCH_UNDERCONSTRAINED_COLOR;
export const ON_SHAPE_FREE_SKETCH_POINT_FONT = {
    angularSegmentCount: 0,
    radialSegmentCount: 2,
    ringFillPercent: 50,
} as const;
export const ON_SHAPE_FREE_SKETCH_POINT_SIZE_PX = 8;

export const ON_SHAPE_REFERENCE_ORIGIN_POINT_COLOR = Vec3.of(0, 0, 0);
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
