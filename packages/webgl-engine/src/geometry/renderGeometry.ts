import type {
    LabelDisplayItem,
    LineBatchRenderNode,
    MarkerDisplayItem,
    SurfaceTriangle,
} from '../types';
import type { Vector3 } from '@occt-draw/math';

export class FaceGeometry {
    constructor(public readonly triangles: readonly SurfaceTriangle[]) {}
}

export class EdgeGeometry {
    constructor(public readonly segments: LineBatchRenderNode['segments']) {}
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
