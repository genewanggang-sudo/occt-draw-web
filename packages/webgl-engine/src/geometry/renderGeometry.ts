import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type { LabelDisplayItem, MarkerDisplayItem, SurfaceTriangle } from '../types';

export type RenderPrimitiveMetadata = ReadonlyMap<string, unknown>;

export class FaceGeometry {
    constructor(public readonly triangles: readonly SurfaceTriangle[]) {}
}

export class EdgeGeometry {
    public readonly metadata: readonly (RenderPrimitiveMetadata | undefined)[];

    constructor(
        public readonly segments: readonly LineSegment3[],
        metadata: readonly (RenderPrimitiveMetadata | undefined)[] = [],
    ) {
        this.metadata = [...metadata];
    }
}

export class PointGeometry {
    public readonly metadata: readonly (RenderPrimitiveMetadata | undefined)[];

    constructor(
        public readonly points: readonly Vector3[],
        metadata: readonly (RenderPrimitiveMetadata | undefined)[] = [],
    ) {
        this.metadata = [...metadata];
    }
}

export class MarkerGeometry {
    constructor(public readonly markers: readonly MarkerDisplayItem[]) {}
}

export class TextGeometry {
    constructor(public readonly labels: readonly LabelDisplayItem[]) {}
}
