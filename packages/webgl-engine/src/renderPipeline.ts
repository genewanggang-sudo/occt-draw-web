import type { LabelAtlas } from './labelAtlas';
import { ColorPass, HighlightPass, OverlayPass, RenderPipeline } from './pipeline';
import type { RenderBackend, RenderBufferCache } from './webgl';

export interface RenderPipelineResources {
    readonly alphaLocation: number;
    readonly backend: RenderBackend;
    readonly buffer: WebGLBuffer;
    readonly colorLocation: number;
    readonly vertexArray: WebGLVertexArrayObject;
    readonly matrixLocation: WebGLUniformLocation;
    readonly pointShapeLocation: WebGLUniformLocation;
    readonly pointSizeLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
    readonly labelAlphaLocation: number;
    labelAtlasGlyphs: LabelAtlas['glyphs'];
    labelAtlasTexture: WebGLTexture;
    readonly labelBuffer: WebGLBuffer;
    readonly bufferCache: RenderBufferCache;
    readonly labelColorLocation: number;
    readonly labelVertexArray: WebGLVertexArrayObject;
    readonly labelMatrixLocation: WebGLUniformLocation;
    readonly labelPositionLocation: number;
    readonly labelProgram: WebGLProgram;
    readonly labelTextureLocation: WebGLUniformLocation;
    readonly labelUvLocation: number;
}

export function createRenderPipeline(): RenderPipeline {
    return new RenderPipeline([new ColorPass(), new HighlightPass(), new OverlayPass()]);
}
