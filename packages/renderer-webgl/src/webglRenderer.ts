import type { CadRenderer, RenderFrameInput, ViewportSize } from '@occt-draw/renderer';
import { createSceneLineVertices, toVertexBuffer } from './lineGeometry';
import { createViewProjectionMatrix } from './matrix';
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
    readonly #matrixLocation: WebGLUniformLocation;
    readonly #positionLocation: number;
    readonly #colorLocation: number;
    readonly #program: WebGLProgram;

    constructor(canvas: HTMLCanvasElement, context: WebGLRenderingContext) {
        this.#canvas = canvas;
        this.#context = context;
        this.#program = createProgram(context);
        this.#positionLocation = context.getAttribLocation(this.#program, 'a_position');
        this.#colorLocation = context.getAttribLocation(this.#program, 'a_color');

        const matrixLocation = context.getUniformLocation(this.#program, 'u_matrix');

        if (!matrixLocation) {
            throw new Error('WebGL 渲染器初始化失败：缺少矩阵 uniform');
        }

        const buffer = context.createBuffer();

        this.#matrixLocation = matrixLocation;
        this.#buffer = buffer;

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
        const context = this.#context;
        const vertices = createSceneLineVertices(input.scene, input.selectedObjectIds ?? []);

        this.resize(input.viewportSize);

        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(this.#program);
        context.bindBuffer(context.ARRAY_BUFFER, this.#buffer);
        context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);

        const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

        context.enableVertexAttribArray(this.#positionLocation);
        context.vertexAttribPointer(this.#positionLocation, 3, context.FLOAT, false, stride, 0);
        context.enableVertexAttribArray(this.#colorLocation);
        context.vertexAttribPointer(
            this.#colorLocation,
            3,
            context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );

        context.uniformMatrix4fv(
            this.#matrixLocation,
            false,
            createViewProjectionMatrix(input.camera, input.viewportSize),
        );
        context.drawArrays(context.LINES, 0, vertices.length);
    }
}
