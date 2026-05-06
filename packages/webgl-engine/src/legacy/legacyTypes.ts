import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type {
    CameraState,
    LabelDisplayItem,
    MarkerDisplayItem,
    RenderDepthRole,
    RenderHighlightState,
    SurfaceTriangle,
    ViewCubeRenderInput,
    ViewportSize,
} from '../types';

export type RenderNodeId = string;
export type RenderNodeKind =
    | 'label-batch'
    | 'line-batch'
    | 'marker-batch'
    | 'point-batch'
    | 'surface-batch';

export interface BaseRenderNode {
    readonly id: RenderNodeId;
    readonly kind: RenderNodeKind;
    readonly name: string;
    readonly depthRole: RenderDepthRole;
    readonly visible: boolean;
}

export interface LabelBatchRenderNode extends BaseRenderNode {
    readonly kind: 'label-batch';
    readonly labels: readonly LabelDisplayItem[];
}

export interface LineBatchRenderNode extends BaseRenderNode {
    readonly color: Vector3;
    readonly kind: 'line-batch';
    readonly segments: readonly LineSegment3[];
}

export interface MarkerBatchRenderNode extends BaseRenderNode {
    readonly kind: 'marker-batch';
    readonly markers: readonly MarkerDisplayItem[];
}

export interface PointBatchRenderNode extends BaseRenderNode {
    readonly color: Vector3;
    readonly kind: 'point-batch';
    readonly points: readonly Vector3[];
    readonly sizePixels: number;
}

export interface SurfaceBatchRenderNode extends BaseRenderNode {
    readonly color: Vector3;
    readonly kind: 'surface-batch';
    readonly opacity: number;
    readonly triangles: readonly SurfaceTriangle[];
}

export type RenderNode =
    | LabelBatchRenderNode
    | LineBatchRenderNode
    | MarkerBatchRenderNode
    | PointBatchRenderNode
    | SurfaceBatchRenderNode;

export interface RenderScene {
    readonly id: string;
    readonly name: string;
    readonly nodes: readonly RenderNode[];
}

export interface RenderFrameInput {
    readonly camera: CameraState;
    readonly scene: RenderScene;
    readonly highlight: RenderHighlightState;
    readonly viewportSize: ViewportSize;
    readonly viewCube?: ViewCubeRenderInput;
}
