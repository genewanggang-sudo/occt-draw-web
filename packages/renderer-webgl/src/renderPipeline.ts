import type { RenderFrameInput } from '@occt-draw/renderer';
import { createSceneLineVertices, toVertexBuffer } from './lineGeometry';
import { createViewProjectionMatrix } from './matrix';

export interface RenderPipelineResources {
    readonly buffer: WebGLBuffer;
    readonly colorLocation: number;
    readonly matrixLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
}

export function renderPipeline(
    context: WebGLRenderingContext,
    resources: RenderPipelineResources,
    input: RenderFrameInput,
): void {
    const vertices = createSceneLineVertices(input.scene, input.highlight);

    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    context.useProgram(resources.program);
    context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
    context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

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

    context.uniformMatrix4fv(
        resources.matrixLocation,
        false,
        createViewProjectionMatrix(input.camera, input.viewportSize),
    );
    context.drawArrays(context.LINES, 0, vertices.length);
}
