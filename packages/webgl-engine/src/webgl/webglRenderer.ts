import { toLabelVertexBuffer } from '../labelGeometry';
import { createLabelProgram } from '../labelShaderProgram';
import { toVertexBuffer } from '../lineGeometry';
import { createViewProjectionMatrix } from '../matrix';
import {
    createNavigationDepthResources,
    disposeNavigationDepthResources,
    type NavigationDepthResources,
} from '../navigationDepth';
import type { DrawCommand, DrawMode } from '../pipeline/renderQueue';
import { createProgram } from '../shaderProgram';
import type { ViewportSize } from '../types';
import type { RenderPipelineResources } from '../renderPipeline';
import { LabelAtlasManager } from './labelAtlasManager';
import { RenderBufferCache } from './renderBufferCache';
import type { RenderBackend, RenderBackendFrameInput } from './renderBackend';
import { createLabelVertexArray, createRenderVertexArray } from './vertexArrayFactory';

export class WebGLRenderer implements RenderBackend {
    private readonly buffer: WebGLBuffer;
    private readonly context: WebGL2RenderingContext;
    private readonly labelAtlasManager: LabelAtlasManager;
    private readonly labelBuffer: WebGLBuffer;
    private readonly labelProgram: WebGLProgram;
    private readonly labelVertexArray: WebGLVertexArrayObject;
    public readonly navigationDepthResources: NavigationDepthResources;
    private readonly program: WebGLProgram;
    private readonly renderBufferCache: RenderBufferCache;
    private readonly vertexArray: WebGLVertexArrayObject;
    private frameCameraKey = '';
    private frameMatrix: Float32List = new Float32Array(16);
    private viewportSize: ViewportSize = { width: 1, height: 1 };

    public readonly resources: RenderPipelineResources;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        context: WebGL2RenderingContext,
    ) {
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
            throw new Error('WebGL renderer initialization failed: missing render uniform.');
        }

        if (!labelMatrixLocation || !labelTextureLocation) {
            throw new Error('WebGL label renderer initialization failed: missing label uniform.');
        }

        const buffer = context.createBuffer();
        const labelBuffer = context.createBuffer();
        const labelAtlasManager = new LabelAtlasManager(context);
        const renderBufferCache = new RenderBufferCache(context);
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
        this.labelAtlasManager = labelAtlasManager;
        this.labelBuffer = labelBuffer;
        this.labelVertexArray = labelVertexArray;
        this.renderBufferCache = renderBufferCache;
        this.vertexArray = vertexArray;
        this.resources = {
            alphaLocation,
            backend: this,
            buffer,
            bufferCache: renderBufferCache,
            colorLocation,
            labelAlphaLocation,
            labelAtlasGlyphs: labelAtlasManager.atlas.glyphs,
            labelAtlasTexture: labelAtlasManager.atlas.texture,
            labelBuffer,
            labelColorLocation,
            labelMatrixLocation,
            labelPositionLocation,
            labelProgram: this.labelProgram,
            labelTextureLocation,
            labelUvLocation,
            labelVertexArray,
            matrixLocation,
            pointShapeLocation,
            pointSizeLocation,
            positionLocation,
            program: this.program,
            vertexArray,
        };

        context.enable(context.DEPTH_TEST);
        context.clearColor(0.035, 0.043, 0.055, 1);
    }

    public beginFrame(input: RenderBackendFrameInput): void {
        const labelAtlas = this.labelAtlasManager.ensureForGraph(input.graph);

        this.resources.labelAtlasGlyphs = labelAtlas.glyphs;
        this.resources.labelAtlasTexture = labelAtlas.texture;
        this.resize(input.viewportSize);
        this.frameMatrix = createViewProjectionMatrix(input.camera, input.viewportSize);
        this.frameCameraKey = getLabelCacheCameraKey(input);
        this.context.bindFramebuffer(this.context.FRAMEBUFFER, null);
        this.renderBufferCache.beginFrame();
        this.context.disable(this.context.CULL_FACE);
        this.context.enable(this.context.DEPTH_TEST);
        this.context.depthFunc(this.context.LESS);
        this.context.depthMask(true);
        this.context.disable(this.context.BLEND);
        this.context.clearColor(0.035, 0.043, 0.055, 1);
        this.context.clear(this.context.COLOR_BUFFER_BIT | this.context.DEPTH_BUFFER_BIT);
        this.context.useProgram(this.program);
        this.context.uniformMatrix4fv(this.resources.matrixLocation, false, this.frameMatrix);
        this.context.bindVertexArray(null);
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
        this.renderBufferCache.dispose();
    }

    public draw(command: Exclude<DrawCommand, { readonly primitiveKind: 'label' }>): void {
        if (command.primitiveKind === 'marker') {
            this.drawMarkerVertices(command);
            return;
        }

        if (command.vertices.length === 0) {
            return;
        }

        const buffer = this.renderBufferCache.getArrayBuffer({
            data: toVertexBuffer(command.vertices),
            dirty: isRenderBufferDirty(command),
            itemCount: command.vertices.length,
            key: command.cacheKey,
        });

        this.applyRenderState(command);
        this.bindRenderVertexBuffer(buffer);
        this.context.uniform1f(this.resources.pointSizeLocation, command.material.pointSize);
        this.context.uniform1f(
            this.resources.pointShapeLocation,
            command.primitiveKind === 'point' ? 1 : 0,
        );
        this.context.drawArrays(
            resolveDrawMode(this.context, command.drawMode),
            0,
            command.vertices.length,
        );
    }

    public drawLabels(command: Extract<DrawCommand, { readonly primitiveKind: 'label' }>): void {
        if (command.vertices.length === 0) {
            return;
        }

        this.applyRenderState(command);
        this.context.useProgram(this.labelProgram);
        this.context.uniformMatrix4fv(this.resources.labelMatrixLocation, false, this.frameMatrix);
        this.context.activeTexture(this.context.TEXTURE0);
        this.context.bindTexture(this.context.TEXTURE_2D, this.resources.labelAtlasTexture);
        this.context.uniform1i(this.resources.labelTextureLocation, 0);
        const buffer = this.renderBufferCache.getArrayBuffer({
            data: toLabelVertexBuffer(command.vertices),
            dirty: isRenderBufferDirty(command),
            itemCount: command.vertices.length,
            key: `${command.cacheKey}:${this.frameCameraKey}`,
        });

        this.bindLabelVertexBuffer(buffer);
        this.context.drawArrays(this.context.TRIANGLES, 0, command.vertices.length);
        this.context.useProgram(this.program);
    }

    public endFrame(): void {
        this.context.depthMask(true);
        this.context.depthFunc(this.context.LESS);
        this.context.disable(this.context.BLEND);
        this.context.bindVertexArray(null);
        this.renderBufferCache.endFrame();
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

    public getContext(): WebGL2RenderingContext {
        return this.context;
    }

    private applyRenderState(command: DrawCommand): void {
        const { renderState } = command.material;

        if (renderState.blend) {
            this.context.enable(this.context.BLEND);
            this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE_MINUS_SRC_ALPHA);
        } else {
            this.context.disable(this.context.BLEND);
        }

        if (renderState.depthTest) {
            this.context.enable(this.context.DEPTH_TEST);
        } else {
            this.context.disable(this.context.DEPTH_TEST);
        }

        this.context.depthMask(renderState.depthWrite);

        if (renderState.polygonOffset) {
            this.context.enable(this.context.POLYGON_OFFSET_FILL);
        } else {
            this.context.disable(this.context.POLYGON_OFFSET_FILL);
        }

        this.context.useProgram(this.program);
    }

    private bindLabelVertexBuffer(buffer: WebGLBuffer): void {
        const stride = 9 * Float32Array.BYTES_PER_ELEMENT;

        disableVertexAttribs(this.context, [
            this.resources.positionLocation,
            this.resources.colorLocation,
            this.resources.alphaLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.enableVertexAttribArray(this.resources.labelPositionLocation);
        this.context.vertexAttribPointer(
            this.resources.labelPositionLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            0,
        );
        this.context.enableVertexAttribArray(this.resources.labelUvLocation);
        this.context.vertexAttribPointer(
            this.resources.labelUvLocation,
            2,
            this.context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(this.resources.labelColorLocation);
        this.context.vertexAttribPointer(
            this.resources.labelColorLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            5 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(this.resources.labelAlphaLocation);
        this.context.vertexAttribPointer(
            this.resources.labelAlphaLocation,
            1,
            this.context.FLOAT,
            false,
            stride,
            8 * Float32Array.BYTES_PER_ELEMENT,
        );
    }

    private bindRenderVertexBuffer(buffer: WebGLBuffer): void {
        const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

        disableVertexAttribs(this.context, [
            this.resources.labelPositionLocation,
            this.resources.labelUvLocation,
            this.resources.labelColorLocation,
            this.resources.labelAlphaLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.enableVertexAttribArray(this.resources.positionLocation);
        this.context.vertexAttribPointer(
            this.resources.positionLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            0,
        );
        this.context.enableVertexAttribArray(this.resources.colorLocation);
        this.context.vertexAttribPointer(
            this.resources.colorLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(this.resources.alphaLocation);
        this.context.vertexAttribPointer(
            this.resources.alphaLocation,
            1,
            this.context.FLOAT,
            false,
            stride,
            6 * Float32Array.BYTES_PER_ELEMENT,
        );
    }

    private drawMarkerVertices(
        command: Extract<DrawCommand, { readonly primitiveKind: 'marker' }>,
    ): void {
        this.applyRenderState(command);

        for (let index = 0; index < command.vertices.length; index += 1) {
            const vertex = command.vertices[index];

            if (!vertex) {
                continue;
            }

            const buffer = this.renderBufferCache.getArrayBuffer({
                data: toVertexBuffer([vertex]),
                dirty: isRenderBufferDirty(command),
                itemCount: 1,
                key: `${command.cacheKey}:${String(index)}`,
            });

            this.bindRenderVertexBuffer(buffer);
            this.context.uniform1f(this.resources.pointSizeLocation, vertex.sizePixels);
            this.context.uniform1f(this.resources.pointShapeLocation, 2);
            this.context.drawArrays(this.context.POINTS, 0, 1);
        }
    }
}

function disableVertexAttribs(context: WebGL2RenderingContext, locations: readonly number[]): void {
    for (const location of locations) {
        if (location >= 0) {
            context.disableVertexAttribArray(location);
        }
    }
}

function getLabelCacheCameraKey(input: RenderBackendFrameInput): string {
    return [
        input.camera.orthographicHeight.toPrecision(12),
        input.camera.fovYRadians.toPrecision(12),
        input.camera.projection,
        input.viewportSize.height.toPrecision(12),
        input.viewportSize.width.toPrecision(12),
    ].join(':');
}

function isRenderBufferDirty(command: DrawCommand): boolean {
    return command.dirtyFlags.geometry || command.dirtyFlags.object || command.dirtyFlags.style;
}

function resolveDrawMode(context: WebGL2RenderingContext, mode: DrawMode): number {
    if (mode === 'lines') {
        return context.LINES;
    }

    if (mode === 'points') {
        return context.POINTS;
    }

    return context.TRIANGLES;
}
