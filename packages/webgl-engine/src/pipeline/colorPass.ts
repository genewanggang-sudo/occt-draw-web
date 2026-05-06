import { createDisplayLabelVertices, toLabelVertexBuffer } from '../labelGeometry';
import {
    createRenderLineVertices,
    createRenderMarkerVertices,
    createRenderPointVertices,
    createRenderSurfaceVertices,
    toVertexBuffer,
} from '../lineGeometry';
import { createViewProjectionMatrix } from '../matrix';
import type { LabelVertex, MarkerVertex, RenderVertex } from '../types';
import type { RenderPass, RenderPassContext } from './renderPass';

export class ColorPass implements RenderPass {
    public readonly name = 'color';

    public execute({ context, input, resources }: RenderPassContext): void {
        const matrix = createViewProjectionMatrix(input.camera, input.viewportSize);
        const surfaceVertices = createRenderSurfaceVertices(input.graph);
        const lineVertices = createRenderLineVertices(input.graph);
        const pointVertices = createRenderPointVertices(input.graph);
        const markerVertices = createRenderMarkerVertices(input.graph);
        const labelVertices = createDisplayLabelVertices({
            atlas: { glyphs: resources.labelAtlasGlyphs },
            camera: input.camera,
            graph: input.graph,
            viewportSize: input.viewportSize,
        });

        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(resources.program);
        context.uniformMatrix4fv(resources.matrixLocation, false, matrix);
        context.bindVertexArray(resources.vertexArray);

        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.depthMask(false);
        drawVertices(context, resources, surfaceVertices, context.TRIANGLES, 1, false);
        context.depthMask(true);
        context.disable(context.BLEND);

        drawVertices(context, resources, lineVertices, context.LINES, 1, false);
        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        drawVertices(context, resources, pointVertices, context.POINTS, 7, true);
        drawMarkerVertices(context, resources, markerVertices);
        context.disable(context.BLEND);

        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.depthMask(false);
        drawLabelVertices(context, resources, labelVertices, matrix);
        context.depthMask(true);
        context.disable(context.BLEND);
        context.bindVertexArray(null);
    }
}

function drawVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly RenderVertex[],
    mode: number,
    pointSize: number,
    usePointShape: boolean,
): void {
    if (vertices.length === 0) {
        return;
    }

    context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
    context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);
    context.uniform1f(resources.pointSizeLocation, pointSize);
    context.uniform1f(resources.pointShapeLocation, usePointShape ? 1 : 0);
    context.drawArrays(mode, 0, vertices.length);
}

function drawMarkerVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly MarkerVertex[],
): void {
    for (const vertex of vertices) {
        context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);
        context.bufferData(context.ARRAY_BUFFER, toVertexBuffer([vertex]), context.STATIC_DRAW);
        context.uniform1f(resources.pointSizeLocation, vertex.sizePixels);
        context.uniform1f(resources.pointShapeLocation, 2);
        context.drawArrays(context.POINTS, 0, 1);
    }
}

function drawLabelVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    vertices: readonly LabelVertex[],
    matrix: Float32Array,
): void {
    if (vertices.length === 0) {
        return;
    }

    context.useProgram(resources.labelProgram);
    context.uniformMatrix4fv(resources.labelMatrixLocation, false, matrix);
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, resources.labelAtlasTexture);
    context.uniform1i(resources.labelTextureLocation, 0);
    context.bindVertexArray(resources.labelVertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, resources.labelBuffer);
    context.bufferData(context.ARRAY_BUFFER, toLabelVertexBuffer(vertices), context.STATIC_DRAW);
    context.drawArrays(context.TRIANGLES, 0, vertices.length);
}
