import type { CadRenderer, RenderFrameInput, ViewportSize } from '@occt-draw/renderer';
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
    readonly #buffer: WebGLBuffer;
    readonly #canvas: HTMLCanvasElement;
    readonly #context: WebGLRenderingContext;
    readonly #program: WebGLProgram;
    readonly #renderPipelineResources: RenderPipelineResources;

    constructor(canvas: HTMLCanvasElement, context: WebGLRenderingContext) {
        this.#canvas = canvas;
        this.#context = context;
        this.#program = createProgram(context);
        const positionLocation = context.getAttribLocation(this.#program, 'a_position');
        const colorLocation = context.getAttribLocation(this.#program, 'a_color');

        const matrixLocation = context.getUniformLocation(this.#program, 'u_matrix');

        if (!matrixLocation) {
            throw new Error('WebGL 渲染器初始化失败：缺少矩阵 uniform');
        }

        const buffer = context.createBuffer();

        this.#buffer = buffer;
        this.#renderPipelineResources = {
            buffer,
            colorLocation,
            matrixLocation,
            positionLocation,
            program: this.#program,
        };

        context.enable(context.DEPTH_TEST);
        context.clearColor(0.035, 0.043, 0.055, 1);
    }

    dispose(): void {
        this.#context.deleteBuffer(this.#buffer);
        this.#context.deleteProgram(this.#program);
    }

    resize(viewportSize: ViewportSize): void {
        const pixelRatio = window.devicePixelRatio || 1;
        const nextWidth = Math.max(1, Math.floor(viewportSize.width * pixelRatio));
        const nextHeight = Math.max(1, Math.floor(viewportSize.height * pixelRatio));

        if (this.#canvas.width !== nextWidth || this.#canvas.height !== nextHeight) {
            this.#canvas.width = nextWidth;
            this.#canvas.height = nextHeight;
        }

        this.#context.viewport(0, 0, nextWidth, nextHeight);
    }

    render(input: RenderFrameInput): void {
        this.resize(input.viewportSize);
        renderPipeline(this.#context, this.#renderPipelineResources, input);
    }
}
