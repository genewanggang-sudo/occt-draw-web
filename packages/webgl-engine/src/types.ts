import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type CameraProjection = 'orthographic' | 'perspective';

export interface ViewportSize {
    readonly height: number;
    readonly width: number;
}

export interface BoundingBox3 {
    readonly max: Vector3;
    readonly min: Vector3;
}

export interface BoundingSphere {
    readonly center: Vector3;
    readonly radius: number;
}

export interface CameraState {
    readonly far: number;
    readonly fovYRadians: number;
    readonly near: number;
    readonly orthographicHeight: number;
    readonly position: Vector3;
    readonly projection: CameraProjection;
    readonly target: Vector3;
    readonly up: Vector3;
}

export type RenderNodeId = string;
export type RenderNodeKind =
    | 'label-batch'
    | 'line-batch'
    | 'marker-batch'
    | 'point-batch'
    | 'surface-batch';
export type RenderDepthRole = 'excluded' | 'primary' | 'secondary';
export type LabelBaseline = 'alphabetic' | 'hanging' | 'ideographic' | 'middle';
export type LabelFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type LabelHorizontalJustify = 'center' | 'left' | 'right';
export type LabelText = string;
export type LabelVerticalJustify = 'baseline' | 'bottom' | 'middle' | 'top';
export type MarkerShape = string;

export interface BaseRenderNode {
    readonly id: RenderNodeId;
    readonly kind: RenderNodeKind;
    readonly name: string;
    readonly depthRole: RenderDepthRole;
    readonly visible: boolean;
}

export interface LabelFrame {
    readonly origin: Vector3;
    readonly xAxis: Vector3;
    readonly yAxis: Vector3;
}

export interface LabelInsert {
    readonly x: number;
    readonly y: number;
}

export interface LabelJustify {
    readonly baseline: LabelBaseline;
    readonly horizontal: LabelHorizontalJustify;
    readonly vertical: LabelVerticalJustify;
}

export interface LabelPaddingPixels {
    readonly x: number;
    readonly y: number;
}

export interface LabelDisplayItem {
    readonly color: Vector3;
    readonly fontWeight?: LabelFontWeight;
    readonly frame: LabelFrame;
    readonly heightPixels: number;
    readonly insert: LabelInsert;
    readonly justify: LabelJustify;
    readonly paddingPixels?: LabelPaddingPixels;
    readonly text: LabelText;
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

export interface MarkerDisplayItem {
    readonly color: Vector3;
    readonly position: Vector3;
    readonly shape: MarkerShape;
    readonly sizePixels: number;
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

export interface SurfaceTriangle {
    readonly a: Vector3;
    readonly b: Vector3;
    readonly c: Vector3;
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
}

export interface RenderHighlightState {
    readonly hoveredObjectId: string | null;
    readonly preselectedObjectId: string | null;
    readonly preselectedPrimitiveId: string | null;
    readonly selectedObjectIds: readonly string[];
    readonly selectedPrimitiveId: string | null;
}

export interface ScreenPoint2 {
    readonly x: number;
    readonly y: number;
}

export interface ScreenRect {
    readonly maxX: number;
    readonly maxY: number;
    readonly minX: number;
    readonly minY: number;
}

export type NavigationDepthRole = 'primary' | 'secondary';

export type NavigationDepthSamplingArea =
    | {
          readonly kind: 'points';
          readonly points: readonly ScreenPoint2[];
      }
    | {
          readonly kind: 'rect';
          readonly rect: ScreenRect;
          readonly stepPixels: number;
      };

export interface NavigationDepthSampleInput {
    readonly area: NavigationDepthSamplingArea;
    readonly camera: CameraState;
    readonly scene: RenderScene;
    readonly includeSecondary: boolean;
    readonly viewportSize: ViewportSize;
}

export interface NavigationDepthSample {
    readonly canvasPoint: ScreenPoint2;
    readonly depth01: number;
    readonly role: NavigationDepthRole;
    readonly viewDepth: number;
    readonly worldPoint: Vector3;
}

export interface RenderEngine {
    dispose(): void;
    render(input: RenderFrameInput): void;
    resize(viewportSize: ViewportSize): void;
    sampleNavigationDepths(input: NavigationDepthSampleInput): readonly NavigationDepthSample[];
}

export interface Vector2 {
    readonly x: number;
    readonly y: number;
}

export interface RenderVertex {
    readonly alpha: number;
    readonly color: Vector3;
    readonly position: Vector3;
}

export interface LabelVertex extends RenderVertex {
    readonly uv: Vector2;
}

export interface MarkerVertex extends RenderVertex {
    readonly sizePixels: number;
}

export type LineVertex = RenderVertex;

export type Matrix4 = Float32Array;
