export { LabelAtlasManager } from './labelAtlasManager';
export type { RenderBackend, RenderBackendFrameInput } from './renderBackend';
export { RenderBufferCache, type RenderBufferCacheStats } from './renderBufferCache';
export { createLabelVertexArray, createRenderVertexArray } from './vertexArrayFactory';
export {
    captureWebglState,
    restoreWebglState,
    withWebglStateRestored,
    type WebglStateSnapshot,
} from './webglStateGuard';
