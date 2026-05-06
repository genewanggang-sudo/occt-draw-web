import type { RenderPipelineResources } from '../renderPipeline';
import type { RenderGraph } from '../core';
import type { CameraState, RenderHighlightState, ViewportSize } from '../types';

export interface RenderFrameContext {
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly highlight?: RenderHighlightState;
    readonly viewportSize: ViewportSize;
}

export interface RenderPassContext {
    readonly context: WebGL2RenderingContext;
    readonly input: RenderFrameContext;
    readonly resources: RenderPipelineResources;
}

// A render pass is one executable stage in the viewport pipeline.
// It owns GPU draw/read behavior for that stage, not CAD business meaning.
export interface RenderPass {
    readonly name: string;
    execute(context: RenderPassContext): void;
}
