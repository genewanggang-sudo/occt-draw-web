import type { RenderFrameInput } from '@occt-draw/renderer';
import {
    createDisplayLineVertices,
    createDisplayPointVertices,
    createDisplaySurfaceVertices,
    toVertexBuffer,
} from './lineGeometry';
import { createViewProjectionMatrix } from './matrix';
import type { RenderVertex } from './types';

export interface RenderPipelineResources {
    readonly alphaLocation: number;
    readonly buffer: WebGLBuffer;
    readonly colorLocation: number;
    readonly matrixLocation: WebGLUniformLocation;
    readonly pointSizeLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
}

export function renderPipeline(
    context: WebGLRenderingContext,
    resources: RenderPipelineResources,
    input: RenderFrameInput,
): void {
    const surfaceVertices = createDisplaySurfaceVertices(input.displayModel);
    const lineVertices = createDisplayLineVertices(input.displayModel, input.highlight);
    const pointVertices = createDisplayPointVertices(input.displayModel);

    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    context.useProgram(resources.program);
    context.uniformMatrix4fv(
        resources.matrixLocation,
        false,
        createViewProjectionMatrix(input.camera, input.viewportSize),
    );
    bindVertexLayout(context, resources);

    context.enable(context.BLEND);
    context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
    context.depthMask(false);
    drawVertices(context, resources, surfaceVertices, context.TRIANGLES, 1);
    context.depthMask(true);
    context.disable(context.BLEND);

    drawVertices(context, resources, lineVertices, context.LINES, 1);
    drawVertices(context, resources, pointVertices, context.POINTS, 7);
}

function bindVertexLayout(
    context: WebGLRenderingContext,
    resources: RenderPipelineResources,
): void {
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

    context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
    context.enableVertexAttribArray(resources.positionLocation);
    context.vertexAttribPointer(resources.positionLocation, 3, context.FLOAT, false, stride, 0);
    context.enableVertexAttribArray(resources.colorLocation);
    context.vertexAttribPointer(
        resources.colorLocation,
        3,
        context.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(resources.alphaLocation);
    context.vertexAttribPointer(
        resources.alphaLocation,
        1,
        context.FLOAT,
        false,
        stride,
        6 * Float32Array.BYTES_PER_ELEMENT,
    );
}

function drawVertices(
    context: WebGLRenderingContext,
    resources: RenderPipelineResources,
    vertices: readonly RenderVertex[],
    mode: number,
    pointSize: number,
): void {
    if (vertices.length === 0) {
        return;
    }

    context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
    context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);
    context.uniform1f(resources.pointSizeLocation, pointSize);
    context.drawArrays(mode, 0, vertices.length);
}
