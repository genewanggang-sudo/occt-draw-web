import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type { LabelDisplayItem, MarkerDisplayItem, SurfaceTriangle } from '../types';

export class FaceGeometry {
    constructor(public readonly triangles: readonly SurfaceTriangle[]) {}
}

export class EdgeGeometry {
    constructor(public readonly segments: readonly LineSegment3[]) {}
}

export class PointGeometry {
    constructor(public readonly points: readonly Vector3[]) {}
}

export class MarkerGeometry {
    constructor(public readonly markers: readonly MarkerDisplayItem[]) {}
}

export class TextGeometry {
    constructor(public readonly labels: readonly LabelDisplayItem[]) {}
}
