import type { CadRenderer, RenderFrameInput, ViewportSize } from '@occt-draw/renderer';
import { createLabelAtlas } from './labelAtlas';
import { createLabelProgram } from './labelShaderProgram';
import { renderPipeline, type RenderPipelineResources } from './renderPipeline';
import { createProgram } from './shaderProgram';

export function createWebglRenderer(canvas: HTMLCanvasElement): CadRenderer {
    const context = canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        depth: true,
    });

    if (!context) {
        throw new Error('当前浏览器不支持 WebGL');
    }

    return new WebglCadRenderer(canvas, context);
}

class WebglCadRenderer implements CadRenderer {
    private readonly buffer: WebGLBuffer;
    private readonly canvas: HTMLCanvasElement;
    private readonly context: WebGLRenderingContext;
    private readonly labelBuffer: WebGLBuffer;
    private readonly labelProgram: WebGLProgram;
    private readonly labelTexture: WebGLTexture;
    private readonly program: WebGLProgram;
    private readonly renderPipelineResources: RenderPipelineResources;

    constructor(canvas: HTMLCanvasElement, context: WebGLRenderingContext) {
        this.canvas = canvas;
        this.context = context;
        this.program = createProgram(context);
        this.labelProgram = createLabelProgram(context);

        const positionLocation = context.getAttribLocation(this.program, 'a_position');
        const colorLocation = context.getAttribLocation(this.program, 'a_color');
        const alphaLocation = context.getAttribLocation(this.program, 'a_alpha');
        const matrixLocation = context.getUniformLocation(this.program, 'u_matrix');
        const pointShapeLocation = context.getUniformLocation(this.program, 'u_point_shape');
        const pointSizeLocation = context.getUniformLocation(this.program, 'u_point_size');
        const labelPositionLocation = context.getAttribLocation(this.labelProgram, 'a_position');
        const labelUvLocation = context.getAttribLocation(this.labelProgram, 'a_uv');
        const labelColorLocation = context.getAttribLocation(this.labelProgram, 'a_color');
        const labelAlphaLocation = context.getAttribLocation(this.labelProgram, 'a_alpha');
        const labelMatrixLocation = context.getUniformLocation(this.labelProgram, 'u_matrix');
        const labelTextureLocation = context.getUniformLocation(this.labelProgram, 'u_texture');

        if (!matrixLocation || !pointShapeLocation || !pointSizeLocation) {
            throw new Error('WebGL 渲染器初始化失败：缺少矩阵 uniform');
        }

        if (!labelMatrixLocation || !labelTextureLocation) {
            throw new Error('WebGL 文字渲染器初始化失败：缺少文字 uniform');
        }

        const buffer = context.createBuffer();
        const labelBuffer = context.createBuffer();
        const labelAtlas = createLabelAtlas(context);

        this.buffer = buffer;
        this.labelBuffer = labelBuffer;
        this.labelTexture = labelAtlas.texture;
        this.renderPipelineResources = {
            alphaLocation,
            buffer,
            colorLocation,
            matrixLocation,
            pointShapeLocation,
            pointSizeLocation,
            positionLocation,
            program: this.program,
            labelAlphaLocation,
            labelAtlasGlyphs: labelAtlas.glyphs,
            labelAtlasTexture: labelAtlas.texture,
            labelBuffer,
            labelColorLocation,
            labelMatrixLocation,
            labelPositionLocation,
            labelProgram: this.labelProgram,
            labelTextureLocation,
            labelUvLocation,
        };

        context.enable(context.DEPTH_TEST);
        context.clearColor(0.035, 0.043, 0.055, 1);
    }

    public dispose(): void {
        this.context.deleteBuffer(this.buffer);
        this.context.deleteBuffer(this.labelBuffer);
        this.context.deleteProgram(this.program);
        this.context.deleteProgram(this.labelProgram);
        this.context.deleteTexture(this.labelTexture);
    }

    public resize(viewportSize: ViewportSize): void {
        const pixelRatio = window.devicePixelRatio || 1;
        const nextWidth = Math.max(1, Math.floor(viewportSize.width * pixelRatio));
        const nextHeight = Math.max(1, Math.floor(viewportSize.height * pixelRatio));

        if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
            this.canvas.width = nextWidth;
            this.canvas.height = nextHeight;
        }

        this.context.viewport(0, 0, nextWidth, nextHeight);
    }

    public render(input: RenderFrameInput): void {
        this.resize(input.viewportSize);
        renderPipeline(this.context, this.renderPipelineResources, input);
    }
}
