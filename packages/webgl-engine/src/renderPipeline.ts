import type { LabelAtlas } from './labelAtlas';
import { ColorPass, HighlightPass, OverlayPass, RenderPipeline } from './pipeline';
import type { RenderBufferCache } from './webgl';

export interface RenderPipelineResources {
    readonly alphaLocation: number;
    readonly buffer: WebGLBuffer;
    readonly colorLocation: number;
    readonly vertexArray: WebGLVertexArrayObject;
    readonly matrixLocation: WebGLUniformLocation;
    readonly pointShapeLocation: WebGLUniformLocation;
    readonly pointSizeLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
    readonly labelAlphaLocation: number;
    readonly labelAtlasGlyphs: LabelAtlas['glyphs'];
    readonly labelAtlasTexture: WebGLTexture;
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
