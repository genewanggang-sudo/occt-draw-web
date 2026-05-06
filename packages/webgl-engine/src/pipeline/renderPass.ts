import type { RenderFrameInput } from '../types';
import type { RenderPipelineResources } from '../renderPipeline';
import type { RenderGraph } from '../core';

export interface RenderPassContext {
    readonly context: WebGL2RenderingContext;
    readonly graph?: RenderGraph | undefined;
    readonly input: RenderFrameInput;
    readonly resources: RenderPipelineResources;
}

// A render pass is one executable stage in the viewport pipeline.
// It owns GPU draw/read behavior for that stage, not CAD business meaning.
export interface RenderPass {
    readonly name: string;
    execute(context: RenderPassContext): void;
}
