import { toLabelVertexBuffer } from '../labelGeometry';
import { toVertexBuffer } from '../lineGeometry';
import { createViewProjectionMatrix } from '../matrix';
import type { LabelVertex, MarkerVertex, RenderVertex } from '../types';
import type { RenderPass, RenderPassContext } from './renderPass';
import { buildColorRenderQueue } from './renderQueue';

export class ColorPass implements RenderPass {
    public readonly name = 'color';

    public execute({ context, input, resources }: RenderPassContext): void {
        const matrix = createViewProjectionMatrix(input.camera, input.viewportSize);
        const queue = buildColorRenderQueue(input, { glyphs: resources.labelAtlasGlyphs });

        context.disable(context.CULL_FACE);
        context.enable(context.DEPTH_TEST);
        context.depthFunc(context.LESS);
        context.depthMask(true);
        context.disable(context.BLEND);
        context.clearColor(0.035, 0.043, 0.055, 1);
        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(resources.program);
        context.uniformMatrix4fv(resources.matrixLocation, false, matrix);
        context.bindVertexArray(null);

        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.depthMask(false);
        for (const command of queue.faces) {
            drawVertices(context, resources, {
                cacheKey: `color:${command.kind}:${command.object.id}`,
                dirty: isRenderBufferDirty(command.object),
                mode: context.TRIANGLES,
                pointShape: 0,
                pointSize: 1,
                vertices: command.vertices,
            });
        }
        context.depthMask(true);
        context.disable(context.BLEND);

        for (const command of queue.edges) {
            drawVertices(context, resources, {
                cacheKey: `color:${command.kind}:${command.object.id}`,
                dirty: isRenderBufferDirty(command.object),
                mode: context.LINES,
                pointShape: 0,
                pointSize: 1,
                vertices: command.vertices,
            });
        }
        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        for (const command of queue.points) {
            drawVertices(context, resources, {
                cacheKey: `color:${command.kind}:${command.object.id}`,
                dirty: isRenderBufferDirty(command.object),
                mode: context.POINTS,
                pointShape: 1,
                pointSize: command.object.style.sizePixels,
                vertices: command.vertices,
            });
        }
        for (const command of queue.markers) {
            drawMarkerVertices(context, resources, command.object, command.vertices);
        }
        context.disable(context.BLEND);

        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
        context.depthMask(false);
        for (const command of queue.labels) {
            drawLabelVertices(
                context,
                resources,
                command.object.id,
                command.vertices,
                matrix,
                getLabelCacheCameraKey(input),
                isRenderBufferDirty(command.object),
            );
        }
        context.depthMask(true);
        context.disable(context.BLEND);
        context.bindVertexArray(null);
    }
}

interface DrawVerticesInput {
    readonly cacheKey: string;
    readonly dirty: boolean;
    readonly mode: number;
    readonly pointShape: number;
    readonly pointSize: number;
    readonly vertices: readonly RenderVertex[];
}

function drawVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    input: DrawVerticesInput,
): void {
    if (input.vertices.length === 0) {
        return;
    }

    const buffer = resources.bufferCache.getArrayBuffer({
        data: toVertexBuffer(input.vertices),
        dirty: input.dirty,
        itemCount: input.vertices.length,
        key: input.cacheKey,
    });

    bindRenderVertexBuffer(context, resources, buffer);
    context.uniform1f(resources.pointSizeLocation, input.pointSize);
    context.uniform1f(resources.pointShapeLocation, input.pointShape);
    context.drawArrays(input.mode, 0, input.vertices.length);
}

function drawMarkerVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    object: { readonly dirtyFlags: RenderDirtyFlags; readonly id: string },
    vertices: readonly MarkerVertex[],
): void {
    for (let index = 0; index < vertices.length; index += 1) {
        const vertex = vertices[index];

        if (!vertex) {
            continue;
        }

        const buffer = resources.bufferCache.getArrayBuffer({
            data: toVertexBuffer([vertex]),
            dirty: isRenderBufferDirty(object),
            itemCount: 1,
            key: `color:marker:${object.id}:${String(index)}`,
        });

        bindRenderVertexBuffer(context, resources, buffer);
        context.uniform1f(resources.pointSizeLocation, vertex.sizePixels);
        context.uniform1f(resources.pointShapeLocation, 2);
        context.drawArrays(context.POINTS, 0, 1);
    }
}

function drawLabelVertices(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    objectId: string,
    vertices: readonly LabelVertex[],
    matrix: Float32Array,
    cameraKey: string,
    dirty: boolean,
): void {
    if (vertices.length === 0) {
        return;
    }

    context.useProgram(resources.labelProgram);
    context.uniformMatrix4fv(resources.labelMatrixLocation, false, matrix);
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, resources.labelAtlasTexture);
    context.uniform1i(resources.labelTextureLocation, 0);
    const buffer = resources.bufferCache.getArrayBuffer({
        data: toLabelVertexBuffer(vertices),
        dirty,
        itemCount: vertices.length,
        key: `color:label:${objectId}:${cameraKey}`,
    });

    bindLabelVertexBuffer(context, resources, buffer);
    context.drawArrays(context.TRIANGLES, 0, vertices.length);
    context.useProgram(resources.program);
}

function bindRenderVertexBuffer(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    buffer: WebGLBuffer,
): void {
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

    disableVertexAttribs(context, [
        resources.labelPositionLocation,
        resources.labelUvLocation,
        resources.labelColorLocation,
        resources.labelAlphaLocation,
    ]);
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
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

function bindLabelVertexBuffer(
    context: WebGL2RenderingContext,
    resources: RenderPassContext['resources'],
    buffer: WebGLBuffer,
): void {
    const stride = 9 * Float32Array.BYTES_PER_ELEMENT;

    disableVertexAttribs(context, [
        resources.positionLocation,
        resources.colorLocation,
        resources.alphaLocation,
    ]);
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.enableVertexAttribArray(resources.labelPositionLocation);
    context.vertexAttribPointer(
        resources.labelPositionLocation,
        3,
        context.FLOAT,
        false,
        stride,
        0,
    );
    context.enableVertexAttribArray(resources.labelUvLocation);
    context.vertexAttribPointer(
        resources.labelUvLocation,
        2,
        context.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(resources.labelColorLocation);
    context.vertexAttribPointer(
        resources.labelColorLocation,
        3,
        context.FLOAT,
        false,
        stride,
        5 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(resources.labelAlphaLocation);
    context.vertexAttribPointer(
        resources.labelAlphaLocation,
        1,
        context.FLOAT,
        false,
        stride,
        8 * Float32Array.BYTES_PER_ELEMENT,
    );
}

function disableVertexAttribs(context: WebGL2RenderingContext, locations: readonly number[]): void {
    for (const location of locations) {
        if (location >= 0) {
            context.disableVertexAttribArray(location);
        }
    }
}

interface RenderDirtyFlags {
    readonly geometry: boolean;
    readonly object: boolean;
    readonly style: boolean;
}

function isRenderBufferDirty(object: { readonly dirtyFlags: RenderDirtyFlags }): boolean {
    return object.dirtyFlags.geometry || object.dirtyFlags.object || object.dirtyFlags.style;
}

function getLabelCacheCameraKey(input: RenderPassContext['input']): string {
    return [
        input.camera.orthographicHeight.toPrecision(12),
        input.camera.fovYRadians.toPrecision(12),
        input.camera.projection,
        input.viewportSize.height.toPrecision(12),
        input.viewportSize.width.toPrecision(12),
    ].join(':');
}
