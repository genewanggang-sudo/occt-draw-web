import type { LabelAtlas } from './labelAtlas';
import { ColorPass, OverlayPass, RenderPipeline } from './pipeline';
import type { RenderFrameContext } from './pipeline';

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
    readonly labelColorLocation: number;
    readonly labelVertexArray: WebGLVertexArrayObject;
    readonly labelMatrixLocation: WebGLUniformLocation;
    readonly labelPositionLocation: number;
    readonly labelProgram: WebGLProgram;
    readonly labelTextureLocation: WebGLUniformLocation;
    readonly labelUvLocation: number;
}

export function renderPipeline(
    context: WebGL2RenderingContext,
    resources: RenderPipelineResources,
    input: RenderFrameContext,
): void {
    new RenderPipeline([new ColorPass(), new OverlayPass()]).execute({
        context,
        input,
        resources,
    });
}
