import type { RenderGraph } from './core';
import { NavigationDepthSampler } from './interaction';
import type { RenderPipeline } from './pipeline';
import { createRenderPipeline } from './renderPipeline';
import type {
    CameraState,
    NavigationDepthSample,
    NavigationDepthSampleInput,
    RenderEngineApi,
    RenderHighlightState,
    ViewportSize,
} from './types';
import { WebGLRenderer } from './webgl/webglRenderer';

const EMPTY_RENDER_HIGHLIGHT_STATE: RenderHighlightState = {
    hoveredObjectId: null,
    preselectedObjectId: null,
    preselectedPrimitiveId: null,
    selectedObjectIds: [],
    selectedPrimitiveId: null,
};

/**
 * @deprecated Use `new RenderEngine(canvas)` from the package entry instead.
 */
export function createWebglRenderer(canvas: HTMLCanvasElement): RenderEngine {
    return new RenderEngine(canvas);
}

function createWebglContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const context = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        depth: true,
    });

    if (!context) {
        throw new Error('当前浏览器不支持 WebGL2');
    }

    return context;
}

export class RenderEngine implements RenderEngineApi {
    private readonly backend: WebGLRenderer;
    private readonly context: WebGL2RenderingContext;
    private graph: RenderGraph | null = null;
    private highlight: RenderHighlightState = EMPTY_RENDER_HIGHLIGHT_STATE;
    private readonly pipeline: RenderPipeline;
    private viewportSize: ViewportSize = { width: 1, height: 1 };

    constructor(private readonly canvas: HTMLCanvasElement) {
        this.context = createWebglContext(canvas);
        this.backend = new WebGLRenderer(canvas, this.context);
        this.pipeline = createRenderPipeline();
    }

    public dispose(): void {
        this.backend.dispose();
    }

    public render(camera: CameraState): void {
        if (!this.graph) {
            throw new Error('RenderEngine.render(camera) requires setGraph(graph) first.');
        }

        const frameInput = {
            camera,
            graph: this.graph,
            highlight: this.highlight,
            viewportSize: this.viewportSize,
        };

        this.backend.beginFrame(frameInput);
        try {
            this.pipeline.execute({
                context: this.context,
                input: frameInput,
                resources: this.backend.resources,
            });
        } finally {
            this.backend.endFrame();
        }

        this.graph.layers.forEach((layer) => {
            layer.objects.forEach((object) => {
                object.clearDirty();
            });
        });
    }

    public resize(viewportSize: ViewportSize): void {
        this.viewportSize = viewportSize;
        this.backend.resize(viewportSize);
    }

    public sampleNavigationDepths(
        input: NavigationDepthSampleInput,
    ): readonly NavigationDepthSample[] {
        this.resize(input.viewportSize);

        return new NavigationDepthSampler(
            this.context,
            this.canvas,
            this.backend.navigationDepthResources,
        ).sample(input);
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
}
