import { toLabelVertexBuffer } from '../labelGeometry';
import { createLabelProgram } from '../labelShaderProgram';
import { toVertexBuffer } from '../lineGeometry';
import { createViewProjectionMatrix } from '../matrix';
import { getCameraViewHeight } from '../cameraGeometry';
import {
    createNavigationDepthResources,
    disposeNavigationDepthResources,
    type NavigationDepthResources,
} from '../navigationDepth';
import { resolveSolidLineRenderStyle } from '../pipeline/lineRenderStyle';
import type { DrawCommand, DrawMode } from '../pipeline/renderQueue';
import type {
    BufferAttributeSemantic,
    BufferIndexType,
    GeometryBuffer,
    VertexAttributeLayout,
} from '../geometry';
import { createProgram } from '../shaderProgram';
import type { CameraState, ViewportSize } from '../types';
import type { RenderPipelineResources } from '../renderPipeline';
import { LabelAtlasManager } from './labelAtlasManager';
import { RenderBufferCache } from './renderBufferCache';
import type {
    ImmediateGeometryDrawInput,
    ImmediateLabelDrawInput,
    ImmediatePrimitiveDrawInput,
    RenderBackend,
    RenderBackendFrameInput,
} from './renderBackend';
import { WebGLResourceRegistry } from './resourceRegistry';
import { WebGLImmediateRenderer, type WebGLRendererBindings } from './webglImmediateRenderer';
import { createLabelVertexArray, createRenderVertexArray } from './vertexArrayFactory';

export class WebGLRenderer implements RenderBackend {
    private readonly buffer: WebGLBuffer;
    private readonly context: WebGL2RenderingContext;
    private readonly immediateRenderer: WebGLImmediateRenderer;
    private readonly labelAtlasManager: LabelAtlasManager;
    private readonly labelBuffer: WebGLBuffer;
    private readonly labelProgram: WebGLProgram;
    private readonly labelVertexArray: WebGLVertexArrayObject;
    private readonly bindings: WebGLRendererBindings;
    public readonly navigationDepthResources: NavigationDepthResources;
    private readonly program: WebGLProgram;
    private readonly registry: WebGLResourceRegistry;
    private readonly renderBufferCache: RenderBufferCache;
    private readonly vertexArray: WebGLVertexArrayObject;
    private frameCameraKey = '';
    private frameMatrix: Float32List = new Float32Array(16);
    private lineDistanceScale = 1;
    private viewportSize: ViewportSize = { width: 1, height: 1 };

    public readonly resources: RenderPipelineResources;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        context: WebGL2RenderingContext,
    ) {
        this.context = context;
        this.registry = new WebGLResourceRegistry(context);
        this.program = this.registry.registerProgram(createProgram(context));
        this.labelProgram = this.registry.registerProgram(createLabelProgram(context));
        this.navigationDepthResources = createNavigationDepthResources(context);
        this.registry.registerDisposable({
            dispose: () => {
                disposeNavigationDepthResources(context, this.navigationDepthResources);
            },
        });

        const positionLocation = context.getAttribLocation(this.program, 'a_position');
        const colorLocation = context.getAttribLocation(this.program, 'a_color');
        const alphaLocation = context.getAttribLocation(this.program, 'a_alpha');
        const lineDistanceLocation = context.getAttribLocation(this.program, 'a_line_distance');
        const lineEdgeDataLocation = context.getAttribLocation(this.program, 'a_line_edge_data');
        const lineEdgeLengthLocation = context.getAttribLocation(
            this.program,
            'a_line_edge_length',
        );
        const linePrimitiveSizeLocation = context.getAttribLocation(
            this.program,
            'a_line_primitive_size',
        );
        const linePrimitiveStyleLocation = context.getAttribLocation(
            this.program,
            'a_line_primitive_style',
        );
        const pointCornerLocation = context.getAttribLocation(this.program, 'a_point_corner');
        const backgroundColorLocation = context.getUniformLocation(
            this.program,
            'u_background_color',
        );
        const backgroundMixProportionLocation = context.getUniformLocation(
            this.program,
            'u_background_mix_proportion',
        );
        const devicePixelRatioLocation = context.getUniformLocation(
            this.program,
            'u_device_pixel_ratio',
        );
        const matrixLocation = context.getUniformLocation(this.program, 'u_matrix');
        const lineIsOrthographicLocation = context.getUniformLocation(
            this.program,
            'u_is_orthographic',
        );
        const lineDistanceScaleLocation = context.getUniformLocation(
            this.program,
            'u_line_distance_scale',
        );
        const lineFilterWidthLocation = context.getUniformLocation(
            this.program,
            'u_line_filter_width',
        );
        const lineModeLocation = context.getUniformLocation(this.program, 'u_line_mode');
        const lineStippleLocation = context.getUniformLocation(this.program, 'u_line_stipple');
        const lineWidthLocation = context.getUniformLocation(this.program, 'u_line_width');
        const pointFontLocation = context.getUniformLocation(this.program, 'u_point_font');
        const pointRenderModeLocation = context.getUniformLocation(
            this.program,
            'u_point_render_mode',
        );
        const pointShapeLocation = context.getUniformLocation(this.program, 'u_point_shape');
        const pointSizeLocation = context.getUniformLocation(this.program, 'u_point_size');
        const pointStrokeColorLocation = context.getUniformLocation(
            this.program,
            'u_point_stroke_color',
        );
        const pointStrokeWidthLocation = context.getUniformLocation(
            this.program,
            'u_point_stroke_width',
        );
        const projectionScaleLocation = context.getUniformLocation(
            this.program,
            'u_projection_scale',
        );
        const viewportSizeLocation = context.getUniformLocation(this.program, 'u_viewport_size');
        const labelPositionLocation = context.getAttribLocation(this.labelProgram, 'a_position');
        const labelUvLocation = context.getAttribLocation(this.labelProgram, 'a_uv');
        const labelColorLocation = context.getAttribLocation(this.labelProgram, 'a_color');
        const labelAlphaLocation = context.getAttribLocation(this.labelProgram, 'a_alpha');
        const labelMatrixLocation = context.getUniformLocation(this.labelProgram, 'u_matrix');
        const labelTextureLocation = context.getUniformLocation(this.labelProgram, 'u_texture');

        if (
            !backgroundColorLocation ||
            !backgroundMixProportionLocation ||
            !devicePixelRatioLocation ||
            !lineDistanceScaleLocation ||
            !lineFilterWidthLocation ||
            !lineIsOrthographicLocation ||
            !lineModeLocation ||
            !lineStippleLocation ||
            !lineWidthLocation ||
            !matrixLocation ||
            !pointFontLocation ||
            !pointRenderModeLocation ||
            !pointShapeLocation ||
            !pointSizeLocation ||
            !pointStrokeColorLocation ||
            !pointStrokeWidthLocation ||
            !projectionScaleLocation ||
            !viewportSizeLocation
        ) {
            throw new Error('WebGL renderer initialization failed: missing render uniform.');
        }

        if (!labelMatrixLocation || !labelTextureLocation) {
            throw new Error('WebGL label renderer initialization failed: missing label uniform.');
        }

        const buffer = this.registry.registerBuffer(context.createBuffer());
        const labelBuffer = this.registry.registerBuffer(context.createBuffer());
        const labelAtlasManager = this.registry.registerDisposable(new LabelAtlasManager(context));
        const renderBufferCache = this.registry.registerDisposable(new RenderBufferCache(context));
        const vertexArray = this.registry.registerVertexArray(
            createRenderVertexArray(context, {
                alphaLocation,
                buffer,
                colorLocation,
                positionLocation,
            }),
        );
        const labelVertexArray = this.registry.registerVertexArray(
            createLabelVertexArray(context, {
                labelAlphaLocation,
                labelBuffer,
                labelColorLocation,
                labelPositionLocation,
                labelUvLocation,
            }),
        );

        this.buffer = buffer;
        this.labelAtlasManager = labelAtlasManager;
        this.labelBuffer = labelBuffer;
        this.labelVertexArray = labelVertexArray;
        this.renderBufferCache = renderBufferCache;
        this.vertexArray = vertexArray;
        this.bindings = {
            alphaLocation,
            colorLocation,
            labelAlphaLocation,
            labelColorLocation,
            labelMatrixLocation,
            labelPositionLocation,
            labelTextureLocation,
            labelUvLocation,
            backgroundColorLocation,
            backgroundMixProportionLocation,
            devicePixelRatioLocation,
            lineDistanceLocation,
            lineDistanceScaleLocation,
            lineEdgeDataLocation,
            lineEdgeLengthLocation,
            lineFilterWidthLocation,
            lineIsOrthographicLocation,
            lineModeLocation,
            linePrimitiveSizeLocation,
            linePrimitiveStyleLocation,
            lineStippleLocation,
            lineWidthLocation,
            matrixLocation,
            pointCornerLocation,
            pointFontLocation,
            pointRenderModeLocation,
            pointShapeLocation,
            pointSizeLocation,
            pointStrokeColorLocation,
            pointStrokeWidthLocation,
            projectionScaleLocation,
            positionLocation,
            viewportSizeLocation,
        };
        this.immediateRenderer = new WebGLImmediateRenderer(context, {
            bindings: this.bindings,
            buffer,
            getFrameMatrix: () => this.frameMatrix,
            getLabelTexture: () => this.labelAtlasManager.atlas.texture,
            labelBuffer,
            labelProgram: this.labelProgram,
            program: this.program,
        });
        this.resources = {
            backend: this,
            labelAtlasGlyphs: labelAtlasManager.atlas.glyphs,
        };

        context.enable(context.DEPTH_TEST);
        context.clearColor(0.035, 0.043, 0.055, 1);
    }

    public beginFrame(input: RenderBackendFrameInput): void {
        const labelAtlas = this.labelAtlasManager.ensureForGraph(input.graph);

        this.resources.labelAtlasGlyphs = labelAtlas.glyphs;
        this.resize(input.viewportSize);
        this.frameMatrix = createViewProjectionMatrix(input.camera, input.viewportSize);
        this.lineDistanceScale =
            Math.max(input.viewportSize.height, 1) / Math.max(getCameraViewHeight(input.camera), 1);
        this.context.useProgram(this.program);
        this.context.uniform1f(this.bindings.lineDistanceScaleLocation, this.lineDistanceScale);
        this.context.uniform1f(
            this.bindings.devicePixelRatioLocation,
            window.devicePixelRatio || 1,
        );
        this.context.uniform1f(
            this.bindings.lineIsOrthographicLocation,
            input.camera.projection === 'orthographic' ? 1 : 0,
        );
        this.context.uniform2f(
            this.bindings.viewportSizeLocation,
            this.canvas.width,
            this.canvas.height,
        );
        this.context.uniform1f(
            this.bindings.projectionScaleLocation,
            getProjectionScale(input.camera, input.viewportSize),
        );
        this.context.uniform4f(this.bindings.backgroundColorLocation, 0.035, 0.043, 0.055, 1);
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
        this.context.uniformMatrix4fv(this.bindings.matrixLocation, false, this.frameMatrix);
        this.context.bindVertexArray(null);
    }

    public dispose(): void {
        this.registry.dispose();
    }

    public draw(command: Exclude<DrawCommand, { readonly primitiveKind: 'label' }>): void {
        if (isMarkerDrawCommand(command)) {
            this.drawMarkerVertices(command);
            return;
        }

        if (command.geometryBuffer.vertexCount === 0) {
            return;
        }

        const buffer = this.renderBufferCache.getGeometryBufferArrayBuffer({
            geometry: command.geometryBuffer,
            dirty: isGeometryBufferDirty(command),
            key: command.cacheKey,
        });

        this.applyRenderState(command);
        this.bindRenderVertexBuffer(buffer, command.geometryBuffer.layout);
        this.applyMaterialVertexAttributes(command.material);
        this.context.uniform1f(this.bindings.pointSizeLocation, command.material.pointSize);
        this.context.uniform1f(
            this.bindings.pointRenderModeLocation,
            command.primitiveKind === 'point' ? command.material.pointRenderMode : 0,
        );
        this.context.uniform1f(
            this.bindings.pointShapeLocation,
            command.primitiveKind === 'point' ? command.material.pointShape : 0,
        );
        this.context.uniform1f(
            this.bindings.lineModeLocation,
            isScreenSpaceLineLayout(command.geometryBuffer.layout) ? 1 : 0,
        );
        this.drawGeometryBuffer(command.geometryBuffer, command.drawMode, command.cacheKey);
    }

    public drawImmediateLabels(input: ImmediateLabelDrawInput): void {
        this.immediateRenderer.drawLabels(input);
    }

    public drawImmediateGeometry(input: ImmediateGeometryDrawInput): void {
        if (input.geometryBuffer.vertexCount === 0) {
            return;
        }

        const buffer = this.renderBufferCache.getGeometryBufferArrayBuffer({
            dirty: true,
            geometry: input.geometryBuffer,
            key: input.cacheKey,
            usage: this.context.DYNAMIC_DRAW,
        });

        this.applyMaterialRenderState(input.material);
        this.bindRenderVertexBuffer(buffer, input.geometryBuffer.layout);
        this.applyMaterialVertexAttributes(input.material);
        this.context.uniform1f(this.bindings.pointSizeLocation, input.material.pointSize);
        this.context.uniform1f(
            this.bindings.pointRenderModeLocation,
            input.primitiveKind === 'point' ? input.material.pointRenderMode : 0,
        );
        this.context.uniform1f(
            this.bindings.pointShapeLocation,
            input.primitiveKind === 'point' ? input.material.pointShape : 0,
        );
        this.context.uniform1f(
            this.bindings.lineModeLocation,
            isScreenSpaceLineLayout(input.geometryBuffer.layout) ? 1 : 0,
        );
        this.drawGeometryBuffer(input.geometryBuffer, input.drawMode, input.cacheKey);
    }

    public drawImmediatePrimitives(input: ImmediatePrimitiveDrawInput): void {
        this.immediateRenderer.drawPrimitives(input);
    }

    public drawLabels(command: Extract<DrawCommand, { readonly primitiveKind: 'label' }>): void {
        if (command.vertices.length === 0) {
            return;
        }

        this.applyRenderState(command);
        this.context.useProgram(this.labelProgram);
        this.context.uniformMatrix4fv(this.bindings.labelMatrixLocation, false, this.frameMatrix);
        this.context.activeTexture(this.context.TEXTURE0);
        this.context.bindTexture(this.context.TEXTURE_2D, this.labelAtlasManager.atlas.texture);
        this.context.uniform1i(this.bindings.labelTextureLocation, 0);
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
        this.applyMaterialRenderState(command.material);
    }

    private applyMaterialRenderState(material: DrawCommand['material']): void {
        const { renderState } = material;

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

        this.context.depthFunc(resolveDepthFunc(this.context, renderState.depthFunc));
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
            this.bindings.positionLocation,
            this.bindings.colorLocation,
            this.bindings.alphaLocation,
            this.bindings.lineDistanceLocation,
            this.bindings.lineEdgeDataLocation,
            this.bindings.lineEdgeLengthLocation,
            this.bindings.linePrimitiveSizeLocation,
            this.bindings.linePrimitiveStyleLocation,
            this.bindings.pointCornerLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.enableVertexAttribArray(this.bindings.labelPositionLocation);
        this.context.vertexAttribPointer(
            this.bindings.labelPositionLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            0,
        );
        this.context.enableVertexAttribArray(this.bindings.labelUvLocation);
        this.context.vertexAttribPointer(
            this.bindings.labelUvLocation,
            2,
            this.context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(this.bindings.labelColorLocation);
        this.context.vertexAttribPointer(
            this.bindings.labelColorLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            5 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(this.bindings.labelAlphaLocation);
        this.context.vertexAttribPointer(
            this.bindings.labelAlphaLocation,
            1,
            this.context.FLOAT,
            false,
            stride,
            8 * Float32Array.BYTES_PER_ELEMENT,
        );
    }

    private bindRenderVertexBuffer(buffer: WebGLBuffer, layout: VertexAttributeLayout): void {
        disableVertexAttribs(this.context, [
            this.bindings.labelPositionLocation,
            this.bindings.labelUvLocation,
            this.bindings.labelColorLocation,
            this.bindings.labelAlphaLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        disableVertexAttribs(this.context, [
            this.bindings.positionLocation,
            this.bindings.colorLocation,
            this.bindings.alphaLocation,
            this.bindings.lineDistanceLocation,
            this.bindings.lineEdgeDataLocation,
            this.bindings.lineEdgeLengthLocation,
            this.bindings.linePrimitiveSizeLocation,
            this.bindings.linePrimitiveStyleLocation,
            this.bindings.pointCornerLocation,
        ]);

        for (const attribute of layout.attributes) {
            const location = this.resolveRenderAttributeLocation(attribute.semantic);

            if (location < 0) {
                continue;
            }

            this.context.enableVertexAttribArray(location);
            this.context.vertexAttribPointer(
                location,
                attribute.components,
                resolveAttributeType(this.context, attribute.type ?? 'float'),
                attribute.normalized ?? false,
                layout.strideBytes ?? layout.strideFloats * Float32Array.BYTES_PER_ELEMENT,
                attribute.offsetBytes ?? attribute.offsetFloats * Float32Array.BYTES_PER_ELEMENT,
            );
        }

        this.context.vertexAttrib1f(this.bindings.lineDistanceLocation, 0);
        this.context.vertexAttrib4f(this.bindings.lineEdgeDataLocation, 1, 0, 0, 2);
        this.context.vertexAttrib1f(this.bindings.lineEdgeLengthLocation, 0);
        this.context.vertexAttrib1f(this.bindings.linePrimitiveSizeLocation, 1);
        this.context.vertexAttrib4f(this.bindings.linePrimitiveStyleLocation, 12, 0, 12, 0);
    }

    private applyMaterialVertexAttributes(material: DrawCommand['material']): void {
        this.context.vertexAttrib3f(
            this.bindings.colorLocation,
            material.color.x,
            material.color.y,
            material.color.z,
        );
        this.context.vertexAttrib1f(this.bindings.alphaLocation, material.alpha);
        this.context.uniform3f(
            this.bindings.pointFontLocation,
            material.pointFont.x,
            material.pointFont.y,
            material.pointFont.z,
        );
        this.context.uniform3f(
            this.bindings.pointStrokeColorLocation,
            material.pointStrokeColor.x,
            material.pointStrokeColor.y,
            material.pointStrokeColor.z,
        );
        this.context.uniform1f(this.bindings.pointStrokeWidthLocation, material.pointStrokeWidthPx);
        this.context.uniform1f(this.bindings.pointRenderModeLocation, material.pointRenderMode);
        this.context.uniform1f(this.bindings.lineDistanceScaleLocation, this.lineDistanceScale);
        this.context.uniform1f(
            this.bindings.backgroundMixProportionLocation,
            material.lineBackgroundMixProportion,
        );
        this.context.uniform1f(
            this.bindings.lineFilterWidthLocation,
            material.lineFilterWidthPx * (window.devicePixelRatio || 1),
        );
        this.context.uniform1f(this.bindings.lineWidthLocation, material.lineWidthPx);
        this.context.uniform4f(
            this.bindings.lineStippleLocation,
            material.lineStipple[0],
            material.lineStipple[1],
            material.lineStipple[2],
            material.lineStipple[3],
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

            this.bindRenderVertexBuffer(buffer, {
                attributes: [
                    { components: 3, offsetFloats: 0, semantic: 'position' },
                    { components: 3, offsetFloats: 3, semantic: 'color' },
                    { components: 1, offsetFloats: 6, semantic: 'alpha' },
                ],
                strideFloats: 7,
            });
            this.context.uniform1f(this.bindings.pointSizeLocation, vertex.sizePixels);
            this.context.uniform3f(this.bindings.pointFontLocation, 1, 0, 50);
            this.context.uniform1f(this.bindings.pointRenderModeLocation, 0);
            this.context.uniform3f(this.bindings.pointStrokeColorLocation, 1, 1, 1);
            this.context.uniform1f(this.bindings.pointStrokeWidthLocation, 0);
            this.context.uniform1f(this.bindings.lineDistanceScaleLocation, this.lineDistanceScale);
            this.context.uniform1f(this.bindings.backgroundMixProportionLocation, 0);
            this.context.uniform1f(
                this.bindings.lineFilterWidthLocation,
                window.devicePixelRatio || 1,
            );
            this.context.uniform1f(this.bindings.lineModeLocation, 0);
            this.context.uniform1f(this.bindings.lineWidthLocation, 1);
            const lineStipple = resolveSolidLineRenderStyle().stipple;
            this.context.uniform4f(
                this.bindings.lineStippleLocation,
                lineStipple[0],
                lineStipple[1],
                lineStipple[2],
                lineStipple[3],
            );
            this.context.uniform1f(this.bindings.pointShapeLocation, 3);
            this.context.drawArrays(this.context.POINTS, 0, 1);
        }
    }

    private drawGeometryBuffer(
        geometry: GeometryBuffer,
        drawMode: DrawMode,
        cacheKey: string,
    ): void {
        if (geometry.index) {
            const indexBuffer = this.renderBufferCache.getElementArrayBuffer({
                dirty: false,
                index: geometry.index,
                key: `${cacheKey}:index`,
            });

            this.context.bindBuffer(this.context.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this.context.drawElements(
                resolveDrawMode(this.context, drawMode),
                geometry.index.data.length,
                resolveIndexType(this.context, geometry.index.type),
                0,
            );
            return;
        }

        this.context.drawArrays(resolveDrawMode(this.context, drawMode), 0, geometry.vertexCount);
    }

    private resolveRenderAttributeLocation(semantic: BufferAttributeSemantic): number {
        if (semantic === 'position') {
            return this.bindings.positionLocation;
        }

        if (semantic === 'color') {
            return this.bindings.colorLocation;
        }

        if (semantic === 'line-distance') {
            return this.bindings.lineDistanceLocation;
        }

        if (semantic === 'line-edge-data') {
            return this.bindings.lineEdgeDataLocation;
        }

        if (semantic === 'line-edge-length') {
            return this.bindings.lineEdgeLengthLocation;
        }

        if (semantic === 'line-primitive-size') {
            return this.bindings.linePrimitiveSizeLocation;
        }

        if (semantic === 'line-primitive-style') {
            return this.bindings.linePrimitiveStyleLocation;
        }

        if (semantic === 'point-corner') {
            return this.bindings.pointCornerLocation;
        }
        return this.bindings.alphaLocation;
    }
}

function isScreenSpaceLineLayout(layout: VertexAttributeLayout): boolean {
    return layout.attributes.some((attribute) => attribute.semantic === 'line-edge-data');
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

function isMarkerDrawCommand(
    command: Exclude<DrawCommand, { readonly primitiveKind: 'label' }>,
): command is Extract<DrawCommand, { readonly primitiveKind: 'marker' }> {
    return command.primitiveKind === 'marker' && 'vertices' in command;
}

function isGeometryBufferDirty(
    command: Exclude<DrawCommand, { readonly primitiveKind: 'label' | 'marker' }>,
): boolean {
    return command.dirtyFlags.geometry || command.dirtyFlags.object;
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

function resolveDepthFunc(context: WebGL2RenderingContext, depthFunc: 'lequal' | 'less'): number {
    return depthFunc === 'lequal' ? context.LEQUAL : context.LESS;
}

function resolveIndexType(context: WebGL2RenderingContext, type: BufferIndexType): number {
    return type === 'uint16' ? context.UNSIGNED_SHORT : context.UNSIGNED_INT;
}

function resolveAttributeType(context: WebGL2RenderingContext, type: 'float' | 'uint8'): number {
    return type === 'uint8' ? context.UNSIGNED_BYTE : context.FLOAT;
}

function getProjectionScale(camera: CameraState, viewportSize: ViewportSize): number {
    const aspect = viewportSize.width / viewportSize.height;

    if (camera.projection === 'orthographic') {
        return 2 / (camera.orthographicHeight * aspect);
    }

    return 1 / (Math.tan(camera.fovYRadians / 2) * aspect);
}
