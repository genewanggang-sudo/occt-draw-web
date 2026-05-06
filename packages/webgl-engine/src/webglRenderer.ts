import type {
    CameraState,
    RenderEngine,
    NavigationDepthSample,
    NavigationDepthSampleInput,
    RenderHighlightState,
    ViewportSize,
} from './types';
import type { RenderGraph } from './core';
import { createLabelProgram } from './labelShaderProgram';
import {
    createNavigationDepthResources,
    disposeNavigationDepthResources,
    type NavigationDepthResources,
} from './navigationDepth';
import { NavigationDepthSampler } from './interaction';
import { createRenderPipeline, type RenderPipelineResources } from './renderPipeline';
import { createProgram } from './shaderProgram';
import type { RenderPipeline } from './pipeline';
import { createLabelVertexArray, createRenderVertexArray, LabelAtlasManager } from './webgl';

const EMPTY_RENDER_HIGHLIGHT_STATE: RenderHighlightState = {
    hoveredObjectId: null,
    preselectedObjectId: null,
    preselectedPrimitiveId: null,
    selectedObjectIds: [],
    selectedPrimitiveId: null,
};

export function createWebglRenderer(canvas: HTMLCanvasElement): RenderEngine {
    const context = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: true,
    });

    if (!context) {
        throw new Error('当前浏览器不支持 WebGL2');
    }

    return new WebglRenderEngine(canvas, context);
}

class WebglRenderEngine implements RenderEngine {
    private readonly buffer: WebGLBuffer;
    private readonly canvas: HTMLCanvasElement;
    private readonly context: WebGL2RenderingContext;
    private graph: RenderGraph | null = null;
    private highlight: RenderHighlightState = EMPTY_RENDER_HIGHLIGHT_STATE;
    private readonly labelAtlasManager: LabelAtlasManager;
    private readonly labelBuffer: WebGLBuffer;
    private readonly labelProgram: WebGLProgram;
    private readonly labelVertexArray: WebGLVertexArrayObject;
    private readonly navigationDepthResources: NavigationDepthResources;
    private readonly pipeline: RenderPipeline;
    private readonly program: WebGLProgram;
    private renderPipelineResources: RenderPipelineResources;
    private readonly vertexArray: WebGLVertexArrayObject;
    private viewportSize: ViewportSize = { width: 1, height: 1 };

    constructor(canvas: HTMLCanvasElement, context: WebGL2RenderingContext) {
        this.canvas = canvas;
        this.context = context;
        this.program = createProgram(context);
        this.labelProgram = createLabelProgram(context);
        this.navigationDepthResources = createNavigationDepthResources(context);

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
        const labelAtlasManager = new LabelAtlasManager(context);
        const vertexArray = createRenderVertexArray(context, {
            alphaLocation,
            buffer,
            colorLocation,
            positionLocation,
        });
        const labelVertexArray = createLabelVertexArray(context, {
            labelAlphaLocation,
            labelBuffer,
            labelColorLocation,
            labelPositionLocation,
            labelUvLocation,
        });

        this.buffer = buffer;
        this.labelBuffer = labelBuffer;
        this.labelVertexArray = labelVertexArray;
        this.labelAtlasManager = labelAtlasManager;
        this.pipeline = createRenderPipeline();
        this.vertexArray = vertexArray;
        this.renderPipelineResources = {
            alphaLocation,
            buffer,
            colorLocation,
            vertexArray,
            matrixLocation,
            pointShapeLocation,
            pointSizeLocation,
            positionLocation,
            program: this.program,
            labelAlphaLocation,
            labelAtlasGlyphs: labelAtlasManager.atlas.glyphs,
            labelAtlasTexture: labelAtlasManager.atlas.texture,
            labelBuffer,
            labelColorLocation,
            labelVertexArray,
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
        this.context.deleteVertexArray(this.vertexArray);
        this.context.deleteVertexArray(this.labelVertexArray);
        this.context.deleteBuffer(this.buffer);
        this.context.deleteBuffer(this.labelBuffer);
        this.context.deleteProgram(this.program);
        this.context.deleteProgram(this.labelProgram);
        this.labelAtlasManager.dispose();
        disposeNavigationDepthResources(this.context, this.navigationDepthResources);
    }

    public resize(viewportSize: ViewportSize): void {
        this.viewportSize = viewportSize;
        const pixelRatio = window.devicePixelRatio || 1;
        const nextWidth = Math.max(1, Math.floor(viewportSize.width * pixelRatio));
        const nextHeight = Math.max(1, Math.floor(viewportSize.height * pixelRatio));

        if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
            this.canvas.width = nextWidth;
            this.canvas.height = nextHeight;
        }

        this.context.viewport(0, 0, nextWidth, nextHeight);
    }

    public setGraph(graph: RenderGraph): void {
        this.graph = graph;
    }

    public setHighlight(highlight: RenderHighlightState): void {
        this.highlight = {
            ...highlight,
            selectedObjectIds: [...highlight.selectedObjectIds],
        };
    }

    public render(camera: CameraState): void {
        if (!this.graph) {
            throw new Error('RenderEngine.render(camera) requires setGraph(graph) first.');
        }

        const labelAtlas = this.labelAtlasManager.ensureForGraph(this.graph);

        this.renderPipelineResources = {
            ...this.renderPipelineResources,
            labelAtlasGlyphs: labelAtlas.glyphs,
            labelAtlasTexture: labelAtlas.texture,
        };
        this.resize(this.viewportSize);
        this.context.bindFramebuffer(this.context.FRAMEBUFFER, null);
        this.pipeline.execute({
            context: this.context,
            resources: this.renderPipelineResources,
            input: {
                camera,
                graph: this.graph,
                highlight: this.highlight,
                viewportSize: this.viewportSize,
            },
        });
    }

    public sampleNavigationDepths(
        input: NavigationDepthSampleInput,
    ): readonly NavigationDepthSample[] {
        this.resize(input.viewportSize);

        return new NavigationDepthSampler(
            this.context,
            this.canvas,
            this.navigationDepthResources,
        ).sample(input);
    }
}
