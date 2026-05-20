import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type {
    LabelDisplayItem,
    MarkerDisplayItem,
    RenderDepthRole,
    SurfaceTriangle,
} from '@occt-draw/webgl-engine';
import type { RenderLayerOptions } from '@occt-draw/webgl-engine';

export type CanvasObjectKind = 'edge' | 'face' | 'label' | 'marker' | 'point';
export type CanvasPrimitiveMetadata = ReadonlyMap<string, unknown>;

export interface CanvasPickRef {
    readonly id: string;
    readonly kind?: string;
    readonly metadata?: ReadonlyMap<string, unknown>;
}

export interface CanvasLayer {
    readonly id: string;
    readonly depthPolicy?: RenderLayerOptions['depthPolicy'];
    readonly navigationRole?: RenderLayerOptions['navigationRole'];
    readonly pickable?: boolean;
    readonly sortPolicy?: RenderLayerOptions['sortPolicy'];
    readonly visible?: boolean;
}

export interface CanvasScene {
    readonly layers: readonly CanvasLayer[];
    readonly objects: readonly CanvasObject[];
}

export interface CanvasObjectBase {
    readonly depthRole?: RenderDepthRole;
    readonly id: string;
    readonly interactionId?: string;
    readonly kind: CanvasObjectKind;
    readonly layerId: string;
    readonly metadata?: ReadonlyMap<string, unknown>;
    readonly name: string;
    readonly pickGranularity?: 'object' | 'primitive';
    readonly pickable?: boolean;
    readonly visible: boolean;
}

export interface CanvasFaceObject extends CanvasObjectBase {
    readonly color: Vector3;
    readonly kind: 'face';
    readonly opacity?: number;
    readonly triangles: readonly SurfaceTriangle[];
}

export interface CanvasEdgeObject extends CanvasObjectBase {
    readonly color: Vector3;
    readonly kind: 'edge';
    readonly primitiveMetadata?: readonly (CanvasPrimitiveMetadata | undefined)[];
    readonly segments: readonly LineSegment3[];
}

export interface CanvasPointObject extends CanvasObjectBase {
    readonly color: Vector3;
    readonly kind: 'point';
    readonly points: readonly Vector3[];
    readonly primitiveMetadata?: readonly (CanvasPrimitiveMetadata | undefined)[];
    readonly sizePixels?: number;
}

export interface CanvasMarkerObject extends CanvasObjectBase {
    readonly kind: 'marker';
    readonly markers: readonly MarkerDisplayItem[];
}

export interface CanvasLabelObject extends CanvasObjectBase {
    readonly kind: 'label';
    readonly labels: readonly LabelDisplayItem[];
}

export type CanvasObject =
    | CanvasEdgeObject
    | CanvasFaceObject
    | CanvasLabelObject
    | CanvasMarkerObject
    | CanvasPointObject;
