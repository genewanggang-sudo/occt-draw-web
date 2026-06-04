import { toLabelVertexBuffer } from '../labelGeometry';
import { toVertexBuffer } from '../lineGeometry';
import type {
    ImmediateCullFace,
    ImmediateDepthFunc,
    ImmediateDrawMode,
    ImmediateLabelDrawInput,
    ImmediatePointShape,
    ImmediatePrimitiveDrawInput,
    ImmediateRenderState,
} from './renderBackend';

export interface WebGLRendererBindings {
    readonly alphaLocation: number;
    readonly colorLocation: number;
    readonly labelAlphaLocation: number;
    readonly labelColorLocation: number;
    readonly labelMatrixLocation: WebGLUniformLocation;
    readonly labelPositionLocation: number;
    readonly labelTextureLocation: WebGLUniformLocation;
    readonly labelUvLocation: number;
    readonly lineDistanceLocation: number;
    readonly lineDistanceScaleLocation: WebGLUniformLocation;
    readonly lineStippleLocation: WebGLUniformLocation;
    readonly matrixLocation: WebGLUniformLocation;
    readonly pointShapeLocation: WebGLUniformLocation;
    readonly pointSizeLocation: WebGLUniformLocation;
    readonly positionLocation: number;
}

export class WebGLImmediateRenderer {
    constructor(
        private readonly context: WebGL2RenderingContext,
        private readonly input: {
            readonly bindings: WebGLRendererBindings;
            readonly buffer: WebGLBuffer;
            readonly getFrameMatrix: () => Float32List;
            readonly getLabelTexture: () => WebGLTexture;
            readonly labelBuffer: WebGLBuffer;
            readonly labelProgram: WebGLProgram;
            readonly program: WebGLProgram;
        },
    ) {}

    public drawLabels(input: ImmediateLabelDrawInput): void {
        if (input.vertices.length === 0) {
            return;
        }

        const { bindings } = this.input;

        this.applyRenderState(input.state);
        this.context.useProgram(this.input.labelProgram);
        this.context.uniformMatrix4fv(bindings.labelMatrixLocation, false, input.matrix);
        this.context.activeTexture(this.context.TEXTURE0);
        this.context.bindTexture(this.context.TEXTURE_2D, this.input.getLabelTexture());
        this.context.uniform1i(bindings.labelTextureLocation, 0);
        this.bindLabelVertexBuffer(this.input.labelBuffer);
        this.context.bufferData(
            this.context.ARRAY_BUFFER,
            toLabelVertexBuffer(input.vertices),
            this.context.STATIC_DRAW,
        );
        this.context.drawArrays(this.context.TRIANGLES, 0, input.vertices.length);
        this.context.useProgram(this.input.program);
    }

    public drawPrimitives(input: ImmediatePrimitiveDrawInput): void {
        if (input.vertices.length === 0) {
            return;
        }

        const { bindings } = this.input;

        this.applyRenderState(input.state);
        this.context.useProgram(this.input.program);
        this.context.uniformMatrix4fv(
            bindings.matrixLocation,
            false,
            input.matrix ?? this.input.getFrameMatrix(),
        );
        this.bindRenderVertexBuffer(this.input.buffer);
        this.context.bufferData(
            this.context.ARRAY_BUFFER,
            toVertexBuffer(input.vertices),
            this.context.STATIC_DRAW,
        );
        this.context.uniform1f(bindings.pointSizeLocation, input.pointSize ?? 1);
        this.context.uniform1f(bindings.lineDistanceScaleLocation, 1);
        this.context.uniform4f(bindings.lineStippleLocation, 12, 0, 12, 0);
        this.context.uniform1f(
            bindings.pointShapeLocation,
            resolveImmediatePointShape(input.pointShape ?? 'none'),
        );
        this.context.drawArrays(
            resolveImmediateDrawMode(this.context, input.drawMode),
            0,
            input.vertices.length,
        );
    }

    private applyRenderState(state: ImmediateRenderState = {}): void {
        if (state.clearDepthBuffer) {
            this.context.clear(this.context.DEPTH_BUFFER_BIT);
        }

        if (state.blend) {
            this.context.enable(this.context.BLEND);
            this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE_MINUS_SRC_ALPHA);
        } else {
            this.context.disable(this.context.BLEND);
        }

        if (state.depthTest ?? true) {
            this.context.enable(this.context.DEPTH_TEST);
        } else {
            this.context.disable(this.context.DEPTH_TEST);
        }

        this.context.depthMask(state.depthWrite ?? true);
        this.context.depthFunc(resolveImmediateDepthFunc(this.context, state.depthFunc ?? 'less'));
        applyImmediateCullFace(this.context, state.cullFace ?? 'none');
    }

    private bindLabelVertexBuffer(buffer: WebGLBuffer): void {
        const { bindings } = this.input;
        const stride = 9 * Float32Array.BYTES_PER_ELEMENT;

        disableVertexAttribs(this.context, [
            bindings.positionLocation,
            bindings.colorLocation,
            bindings.alphaLocation,
            bindings.lineDistanceLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.enableVertexAttribArray(bindings.labelPositionLocation);
        this.context.vertexAttribPointer(
            bindings.labelPositionLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            0,
        );
        this.context.enableVertexAttribArray(bindings.labelUvLocation);
        this.context.vertexAttribPointer(
            bindings.labelUvLocation,
            2,
            this.context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(bindings.labelColorLocation);
        this.context.vertexAttribPointer(
            bindings.labelColorLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            5 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(bindings.labelAlphaLocation);
        this.context.vertexAttribPointer(
            bindings.labelAlphaLocation,
            1,
            this.context.FLOAT,
            false,
            stride,
            8 * Float32Array.BYTES_PER_ELEMENT,
        );
    }

    private bindRenderVertexBuffer(buffer: WebGLBuffer): void {
        const { bindings } = this.input;
        const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

        disableVertexAttribs(this.context, [
            bindings.labelPositionLocation,
            bindings.labelUvLocation,
            bindings.labelColorLocation,
            bindings.labelAlphaLocation,
            bindings.lineDistanceLocation,
        ]);
        this.context.bindBuffer(this.context.ARRAY_BUFFER, buffer);
        this.context.enableVertexAttribArray(bindings.positionLocation);
        this.context.vertexAttribPointer(
            bindings.positionLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            0,
        );
        this.context.enableVertexAttribArray(bindings.colorLocation);
        this.context.vertexAttribPointer(
            bindings.colorLocation,
            3,
            this.context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.enableVertexAttribArray(bindings.alphaLocation);
        this.context.vertexAttribPointer(
            bindings.alphaLocation,
            1,
            this.context.FLOAT,
            false,
            stride,
            6 * Float32Array.BYTES_PER_ELEMENT,
        );
        this.context.vertexAttrib1f(bindings.lineDistanceLocation, 0);
    }
}

function applyImmediateCullFace(
    context: WebGL2RenderingContext,
    cullFace: ImmediateCullFace,
): void {
    if (cullFace === 'none') {
        context.disable(context.CULL_FACE);
        return;
    }

    context.enable(context.CULL_FACE);
    context.frontFace(context.CCW);
    context.cullFace(cullFace === 'front' ? context.FRONT : context.BACK);
}

function disableVertexAttribs(context: WebGL2RenderingContext, locations: readonly number[]): void {
    for (const location of locations) {
        if (location >= 0) {
            context.disableVertexAttribArray(location);
        }
    }
}

function resolveImmediateDepthFunc(
    context: WebGL2RenderingContext,
    depthFunc: ImmediateDepthFunc,
): number {
    return depthFunc === 'lequal' ? context.LEQUAL : context.LESS;
}

function resolveImmediateDrawMode(
    context: WebGL2RenderingContext,
    mode: ImmediateDrawMode,
): number {
    if (mode === 'lines') {
        return context.LINES;
    }

    if (mode === 'points') {
        return context.POINTS;
    }

    return context.TRIANGLES;
}

function resolveImmediatePointShape(pointShape: ImmediatePointShape): number {
    if (pointShape === 'halo') {
        return 4;
    }

    if (pointShape === 'ring') {
        return 3;
    }

    if (pointShape === 'circle') {
        return 1;
    }

    if (pointShape === 'marker') {
        return 2;
    }

    return 0;
}
