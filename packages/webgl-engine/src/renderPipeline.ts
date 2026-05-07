import type { LabelAtlas } from './labelAtlas';
import { ColorPass, HighlightPass, OverlayPass, RenderPipeline } from './pipeline';
import type { RenderBackend } from './webgl';

export interface RenderPipelineResources {
    readonly backend: RenderBackend;
    labelAtlasGlyphs: LabelAtlas['glyphs'];
}

export function createRenderPipeline(): RenderPipeline {
    return new RenderPipeline([new ColorPass(), new HighlightPass(), new OverlayPass()]);
}
