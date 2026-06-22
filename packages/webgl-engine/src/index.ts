export {
    RenderDirtyFlags,
    RenderGraph,
    RenderGroup,
    RenderLayer,
    RenderObject,
    type GeometryBounds,
    type RenderDirtyFlagInput,
    type RenderLayerDepthPolicy,
    type RenderLayerNavigationRole,
    type RenderLayerOptions,
    type RenderLayerSortPolicy,
    type RenderObjectOptions,
} from './core';
export {
    EdgeGeometry,
    FaceGeometry,
    MarkerGeometry,
    PointGeometry,
    TextGeometry,
    type RenderPrimitiveMetadata,
} from './geometry';
export { RenderableObject } from './renderableObject';
export type { RenderObjectBuilder } from './renderableObject';
export { EdgeSet, FaceSet, MarkerSet, PointSet, TextLabelSet } from './scene';
export {
    EdgeStyle,
    FaceStyle,
    MarkerStyle,
    PointStyle,
    TextStyle,
    type EdgeLineStyle,
    type PointFont,
} from './style';
export {
    ColorPass,
    HighlightPass,
    OverlayPass,
    RenderPipeline,
    type RenderFrameContext,
    type RenderPass,
    type RenderPassContext,
} from './pipeline';
export {
    HoverHighlight,
    NavigationDepthSampler,
    PreselectionHighlight,
    RenderObjectPicker,
    SelectionHighlight,
    type PickKey,
    type PickRenderObjectInput,
    type PickResult,
    type PickTargetKind,
} from './interaction';
export { ViewCube, ViewportWidget } from './addon';
export {
    DEFAULT_CAMERA_STATE,
    cameraDepth01ToViewDepth,
    canvasDepthToWorld,
    createCameraStateFromFrame,
    createStandardCameraState,
    fitCameraToBounds,
    frameCameraClippingToBounds,
    getStandardCameraFrame,
    type StandardCameraFrame,
    type StandardCameraView,
} from './camera';
export { calculateBoundingSphere, getBoundingBoxCorners, getDefaultBoundingBox } from './bounds';
export {
    calculateCameraBasis,
    calculateViewDepth,
    getCameraViewHeight,
    projectBoundsToScreenRect,
    projectWorldToScreen,
    screenPointToWorldOnViewPlane,
    screenPointToWorldRay,
    type CameraBasis,
} from './cameraGeometry';
export { createRenderPrimitiveId, type RenderPrimitiveKind } from './primitiveId';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- Legacy facade remains exported for compatibility.
export { RenderEngine, createWebglRenderer } from './renderEngine';
export type {
    BoundingBox3,
    BoundingSphere,
    RenderEngineApi,
    CameraProjection,
    CameraState,
    RenderDepthRole,
    LabelDisplayItem,
    LabelFontWeight,
    LabelText,
    MarkerDisplayItem,
    MarkerShape,
    NavigationDepthGraphSampleInput,
    NavigationDepthRole,
    NavigationDepthSample,
    NavigationDepthSampleInputBase,
    NavigationDepthSampleInput,
    NavigationDepthSamplingArea,
    RenderHighlightState,
    ScreenPoint2,
    ScreenRect,
    SurfaceTriangle,
    ViewCubeArrowCommand,
    ViewCubeCornerId,
    ViewCubeFaceId,
    ViewCubeRenderInput,
    ViewCubeTargetId,
    ViewportSize,
} from './types';
