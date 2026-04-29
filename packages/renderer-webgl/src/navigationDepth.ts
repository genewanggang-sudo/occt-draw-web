import type {
    DisplayModel,
    DisplayNavigationRole,
    DisplayObject,
    MarkerBatchDisplayObject,
} from '@occt-draw/display';
import {
    cameraDepth01ToViewDepth,
    canvasDepthToWorld,
    type NavigationDepthRole,
    type NavigationDepthSample,
    type NavigationDepthSampleInput,
    type ScreenPoint2,
} from '@occt-draw/renderer';
import type { Vector3 } from '@occt-draw/math';
import { createViewProjectionMatrix } from './matrix';

interface NavigationDepthTarget {
    readonly depthTexture: WebGLTexture;
    readonly framebuffer: WebGLFramebuffer;
    readonly height: number;
    readonly roleTexture: WebGLTexture;
    readonly width: number;
}

interface NavigationDepthCache {
    readonly camera: NavigationDepthSampleInput['camera'];
    readonly displayModel: DisplayModel;
    readonly height: number;
    readonly includePlanes: boolean;
    readonly viewportHeight: number;
    readonly viewportWidth: number;
    readonly width: number;
}

interface NavigationDepthBatch {
    readonly mode: number;
    readonly pointShape: number;
    readonly pointSize: number;
    readonly positions: readonly Vector3[];
    readonly role: NavigationDepthRole;
}

export interface NavigationDepthResources {
    cache: NavigationDepthCache | null;
    target: NavigationDepthTarget | null;
    readonly buffer: WebGLBuffer;
    readonly matrixLocation: WebGLUniformLocation;
    readonly pointShapeLocation: WebGLUniformLocation;
    readonly pointSizeLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
    readonly roleCodeLocation: WebGLUniformLocation;
    readonly vertexArray: WebGLVertexArrayObject;
}

const MODEL_ROLE_CODE = 64 / 255;
const REFERENCE_PLANE_ROLE_CODE = 192 / 255;
const DEPTH_MAX_INT = 16_777_215;

const vertexShaderSource = `#version 300 es
in vec3 a_position;
uniform mat4 u_matrix;
uniform float u_point_size;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    gl_PointSize = u_point_size;
}
`;

const fragmentShaderSource = `#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_point_shape;
uniform float u_role_code;

out vec4 out_role;

vec3 encodeDepth(float depth) {
    float scaledDepth = clamp(depth, 0.0, 1.0) * 16777215.0;
    float red = floor(scaledDepth / 65536.0);
    float green = floor((scaledDepth - red * 65536.0) / 256.0);
    float blue = floor(scaledDepth - red * 65536.0 - green * 256.0);

    return vec3(red, green, blue) / 255.0;
}

void main() {
    if (u_point_shape > 1.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float outerRing = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);
        float innerCutout = smoothstep(0.32, 0.36, distanceFromCenter);
        float centerDot = 1.0 - smoothstep(0.1, 0.18, distanceFromCenter);
        float alpha = max(outerRing * innerCutout, centerDot);

        if (alpha <= 0.0) {
            discard;
        }
    } else if (u_point_shape > 0.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float edgeAlpha = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);

        if (edgeAlpha <= 0.0) {
            discard;
        }
    }

    out_role = vec4(encodeDepth(gl_FragCoord.z), u_role_code);
}
`;

export function createNavigationDepthResources(
    context: WebGL2RenderingContext,
): NavigationDepthResources {
    const program = createProgram(context);
    const buffer = context.createBuffer();
    const positionLocation = context.getAttribLocation(program, 'a_position');
    const matrixLocation = context.getUniformLocation(program, 'u_matrix');
    const pointSizeLocation = context.getUniformLocation(program, 'u_point_size');
    const pointShapeLocation = context.getUniformLocation(program, 'u_point_shape');
    const roleCodeLocation = context.getUniformLocation(program, 'u_role_code');

    if (
        positionLocation < 0 ||
        !matrixLocation ||
        !pointSizeLocation ||
        !pointShapeLocation ||
        !roleCodeLocation
    ) {
        context.deleteProgram(program);
        throw new Error('WebGL navigation depth renderer initialization failed.');
    }

    const vertexArray = createNavigationDepthVertexArray(context, {
        buffer,
        positionLocation,
    });

    return {
        buffer,
        cache: null,
        matrixLocation,
        pointShapeLocation,
        pointSizeLocation,
        positionLocation,
        program,
        roleCodeLocation,
        target: null,
        vertexArray,
    };
}

export function disposeNavigationDepthResources(
    context: WebGL2RenderingContext,
    resources: NavigationDepthResources,
): void {
    disposeNavigationDepthTarget(context, resources.target);
    context.deleteVertexArray(resources.vertexArray);
    context.deleteBuffer(resources.buffer);
    context.deleteProgram(resources.program);
    resources.cache = null;
    resources.target = null;
}

export function sampleNavigationDepths(
    context: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    resources: NavigationDepthResources,
    input: NavigationDepthSampleInput,
): readonly NavigationDepthSample[] {
    const target = ensureNavigationDepthTarget(context, resources, canvas.width, canvas.height);

    if (shouldRenderNavigationDepth(resources.cache, target, input)) {
        renderNavigationDepth(context, resources, target, input);
        resources.cache = {
            camera: input.camera,
            displayModel: input.displayModel,
            height: target.height,
            includePlanes: input.includePlanes,
            viewportHeight: input.viewportSize.height,
            viewportWidth: input.viewportSize.width,
            width: target.width,
        };
    }

    context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer);
    context.readBuffer(context.COLOR_ATTACHMENT0);

    const samples =
        input.area.kind === 'points'
            ? readPointSamples(context, canvas, input)
            : readRectSamples(context, canvas, input);

    context.bindFramebuffer(context.FRAMEBUFFER, null);
    context.readBuffer(context.BACK);
    context.viewport(0, 0, canvas.width, canvas.height);
    context.clearColor(0.035, 0.043, 0.055, 1);
    context.depthMask(true);

    return samples;
}

function renderNavigationDepth(
    context: WebGL2RenderingContext,
    resources: NavigationDepthResources,
    target: NavigationDepthTarget,
    input: NavigationDepthSampleInput,
): void {
    const matrix = createViewProjectionMatrix(input.camera, input.viewportSize);
    const batches = createNavigationDepthBatches(context, input.displayModel, input.includePlanes);

    context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer);
    context.viewport(0, 0, target.width, target.height);
    context.clearColor(0, 0, 0, 0);
    context.clearDepth(1);
    context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
    context.disable(context.BLEND);
    context.enable(context.DEPTH_TEST);
    context.depthMask(true);
    context.depthFunc(context.LEQUAL);
    context.useProgram(resources.program);
    context.uniformMatrix4fv(resources.matrixLocation, false, matrix);
    context.bindVertexArray(resources.vertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, resources.buffer);

    for (const batch of batches) {
        if (batch.positions.length === 0) {
            continue;
        }

        context.bufferData(
            context.ARRAY_BUFFER,
            toPositionBuffer(batch.positions),
            context.STATIC_DRAW,
        );
        context.uniform1f(resources.pointSizeLocation, batch.pointSize);
        context.uniform1f(resources.pointShapeLocation, batch.pointShape);
        context.uniform1f(resources.roleCodeLocation, roleToCode(batch.role));
        context.drawArrays(batch.mode, 0, batch.positions.length);
    }

    context.depthFunc(context.LESS);
    context.bindVertexArray(null);
}

function createNavigationDepthVertexArray(
    context: WebGL2RenderingContext,
    input: {
        readonly buffer: WebGLBuffer;
        readonly positionLocation: number;
    },
): WebGLVertexArrayObject {
    const vertexArray = context.createVertexArray();

    context.bindVertexArray(vertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, input.buffer);
    context.enableVertexAttribArray(input.positionLocation);
    context.vertexAttribPointer(input.positionLocation, 3, context.FLOAT, false, 0, 0);
    context.bindVertexArray(null);
    context.bindBuffer(context.ARRAY_BUFFER, null);

    return vertexArray;
}

function readPointSamples(
    context: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    input: NavigationDepthSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind !== 'points') {
        return [];
    }

    const samples: NavigationDepthSample[] = [];
    const pixel = new Uint8Array(4);
    const scaleX = canvas.width / Math.max(input.viewportSize.width, 1);
    const scaleY = canvas.height / Math.max(input.viewportSize.height, 1);

    for (const point of input.area.points) {
        const deviceX = clampInteger(Math.floor(point.x * scaleX), 0, canvas.width - 1);
        const deviceYFromTop = clampInteger(Math.floor(point.y * scaleY), 0, canvas.height - 1);
        const deviceY = canvas.height - 1 - deviceYFromTop;

        context.readPixels(deviceX, deviceY, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);

        const sample = decodeNavigationDepthPixel(pixel, 0, point, input);

        if (sample) {
            samples.push(sample);
        }
    }

    return dedupeNavigationDepthSamples(samples);
}

function readRectSamples(
    context: WebGL2RenderingContext,
    canvas: HTMLCanvasElement,
    input: NavigationDepthSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind !== 'rect') {
        return [];
    }

    const scaleX = canvas.width / Math.max(input.viewportSize.width, 1);
    const scaleY = canvas.height / Math.max(input.viewportSize.height, 1);
    const minDeviceX = clampInteger(
        Math.floor(Math.min(input.area.rect.minX, input.area.rect.maxX) * scaleX),
        0,
        canvas.width - 1,
    );
    const maxDeviceX = clampInteger(
        Math.ceil(Math.max(input.area.rect.minX, input.area.rect.maxX) * scaleX),
        minDeviceX + 1,
        canvas.width,
    );
    const minDeviceYFromTop = clampInteger(
        Math.floor(Math.min(input.area.rect.minY, input.area.rect.maxY) * scaleY),
        0,
        canvas.height - 1,
    );
    const maxDeviceYFromTop = clampInteger(
        Math.ceil(Math.max(input.area.rect.minY, input.area.rect.maxY) * scaleY),
        minDeviceYFromTop + 1,
        canvas.height,
    );
    const readWidth = maxDeviceX - minDeviceX;
    const readHeight = maxDeviceYFromTop - minDeviceYFromTop;
    const readY = canvas.height - maxDeviceYFromTop;
    const pixels = new Uint8Array(readWidth * readHeight * 4);
    const deviceStep = Math.max(1, Math.round(input.area.stepPixels * Math.max(scaleX, scaleY)));
    const samples: NavigationDepthSample[] = [];

    context.readPixels(
        minDeviceX,
        readY,
        readWidth,
        readHeight,
        context.RGBA,
        context.UNSIGNED_BYTE,
        pixels,
    );

    for (
        let deviceYFromTop = minDeviceYFromTop;
        deviceYFromTop < maxDeviceYFromTop;
        deviceYFromTop += deviceStep
    ) {
        const row = maxDeviceYFromTop - 1 - deviceYFromTop;

        for (let deviceX = minDeviceX; deviceX < maxDeviceX; deviceX += deviceStep) {
            const column = deviceX - minDeviceX;
            const index = (row * readWidth + column) * 4;
            const canvasPoint = {
                x: (deviceX + 0.5) / scaleX,
                y: (deviceYFromTop + 0.5) / scaleY,
            };
            const sample = decodeNavigationDepthPixel(pixels, index, canvasPoint, input);

            if (sample) {
                samples.push(sample);
            }
        }
    }

    return dedupeNavigationDepthSamples(samples);
}

function decodeNavigationDepthPixel(
    pixels: Uint8Array,
    index: number,
    canvasPoint: ScreenPoint2,
    input: NavigationDepthSampleInput,
): NavigationDepthSample | null {
    const roleCode = pixels[index + 3] ?? 0;

    if (roleCode < 32) {
        return null;
    }

    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const depth01 = (red * 65536 + green * 256 + blue) / DEPTH_MAX_INT;
    const role = roleCode >= 128 ? 'reference-plane' : 'model';

    if (!input.includePlanes && role === 'reference-plane') {
        return null;
    }

    return {
        canvasPoint,
        depth01,
        role,
        viewDepth: cameraDepth01ToViewDepth(input.camera, depth01),
        worldPoint: canvasDepthToWorld(input.camera, input.viewportSize, canvasPoint, depth01),
    };
}

function createNavigationDepthBatches(
    context: WebGL2RenderingContext,
    displayModel: DisplayModel,
    includePlanes: boolean,
): readonly NavigationDepthBatch[] {
    const batches: NavigationDepthBatch[] = [];

    for (const object of displayModel.objects) {
        if (!shouldIncludeObject(object, includePlanes)) {
            continue;
        }

        const role = toNavigationDepthRole(object.navigationRole);

        if (!role) {
            continue;
        }

        if (object.kind === 'surface-batch') {
            batches.push({
                mode: context.TRIANGLES,
                pointShape: 0,
                pointSize: 1,
                positions: object.triangles.flatMap((triangle) => [
                    triangle.a,
                    triangle.b,
                    triangle.c,
                ]),
                role,
            });
        } else if (object.kind === 'line-batch') {
            batches.push({
                mode: context.LINES,
                pointShape: 0,
                pointSize: 1,
                positions: object.segments.flatMap((segment) => [segment.start, segment.end]),
                role,
            });
        } else if (object.kind === 'point-batch') {
            batches.push({
                mode: context.POINTS,
                pointShape: 1,
                pointSize: object.sizePixels,
                positions: object.points,
                role,
            });
        } else if (object.kind === 'marker-batch') {
            batches.push(...createMarkerBatches(context, object, role));
        }
    }

    return batches;
}

function createMarkerBatches(
    context: WebGL2RenderingContext,
    object: MarkerBatchDisplayObject,
    role: NavigationDepthRole,
): readonly NavigationDepthBatch[] {
    return object.markers.map((marker) => ({
        mode: context.POINTS,
        pointShape: 2,
        pointSize: marker.sizePixels,
        positions: [marker.position],
        role,
    }));
}

function shouldIncludeObject(object: DisplayObject, includePlanes: boolean): boolean {
    if (!object.visible || object.navigationRole === 'annotation') {
        return false;
    }

    return object.navigationRole === 'model' || includePlanes;
}

function toNavigationDepthRole(role: DisplayNavigationRole): NavigationDepthRole | null {
    if (role === 'model' || role === 'reference-plane') {
        return role;
    }

    return null;
}

function shouldRenderNavigationDepth(
    cache: NavigationDepthCache | null,
    target: NavigationDepthTarget,
    input: NavigationDepthSampleInput,
): boolean {
    return (
        cache?.camera !== input.camera ||
        cache.displayModel !== input.displayModel ||
        cache.includePlanes !== input.includePlanes ||
        cache.viewportWidth !== input.viewportSize.width ||
        cache.viewportHeight !== input.viewportSize.height ||
        cache.width !== target.width ||
        cache.height !== target.height
    );
}

function ensureNavigationDepthTarget(
    context: WebGL2RenderingContext,
    resources: NavigationDepthResources,
    width: number,
    height: number,
): NavigationDepthTarget {
    if (resources.target?.width === width && resources.target.height === height) {
        return resources.target;
    }

    disposeNavigationDepthTarget(context, resources.target);

    const framebuffer = context.createFramebuffer();
    const roleTexture = context.createTexture();
    const depthTexture = context.createTexture();

    context.bindTexture(context.TEXTURE_2D, roleTexture);
    context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        width,
        height,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        null,
    );
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);

    context.bindTexture(context.TEXTURE_2D, depthTexture);
    context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.DEPTH_COMPONENT32F,
        width,
        height,
        0,
        context.DEPTH_COMPONENT,
        context.FLOAT,
        null,
    );
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);

    context.bindFramebuffer(context.FRAMEBUFFER, framebuffer);
    context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.COLOR_ATTACHMENT0,
        context.TEXTURE_2D,
        roleTexture,
        0,
    );
    context.framebufferTexture2D(
        context.FRAMEBUFFER,
        context.DEPTH_ATTACHMENT,
        context.TEXTURE_2D,
        depthTexture,
        0,
    );
    context.drawBuffers([context.COLOR_ATTACHMENT0]);
    context.readBuffer(context.COLOR_ATTACHMENT0);

    if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE) {
        disposeNavigationDepthTarget(context, {
            depthTexture,
            framebuffer,
            height,
            roleTexture,
            width,
        });
        throw new Error('WebGL navigation depth framebuffer is incomplete.');
    }

    context.bindFramebuffer(context.FRAMEBUFFER, null);
    context.bindTexture(context.TEXTURE_2D, null);

    resources.cache = null;
    resources.target = { depthTexture, framebuffer, height, roleTexture, width };

    return resources.target;
}

function disposeNavigationDepthTarget(
    context: WebGL2RenderingContext,
    target: NavigationDepthTarget | null,
): void {
    if (!target) {
        return;
    }

    context.deleteTexture(target.depthTexture);
    context.deleteFramebuffer(target.framebuffer);
    context.deleteTexture(target.roleTexture);
}

function createProgram(context: WebGL2RenderingContext): WebGLProgram {
    const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
    const program = context.createProgram();

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const message = context.getProgramInfoLog(program) ?? 'Unknown link error';

        context.deleteProgram(program);
        throw new Error(`WebGL navigation depth shader program link failed: ${message}`);
    }

    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);

    return program;
}

function createShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = context.createShader(type);

    if (!shader) {
        throw new Error(
            'WebGL navigation depth renderer initialization failed: cannot create shader.',
        );
    }

    context.shaderSource(shader, source);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const message = context.getShaderInfoLog(shader) ?? 'Unknown compile error';

        context.deleteShader(shader);
        throw new Error(`WebGL navigation depth shader compile failed: ${message}`);
    }

    return shader;
}

function toPositionBuffer(positions: readonly Vector3[]): Float32Array {
    const buffer = new Float32Array(positions.length * 3);
    let offset = 0;

    for (const position of positions) {
        buffer[offset] = position.x;
        buffer[offset + 1] = position.y;
        buffer[offset + 2] = position.z;
        offset += 3;
    }

    return buffer;
}

function roleToCode(role: NavigationDepthRole): number {
    return role === 'reference-plane' ? REFERENCE_PLANE_ROLE_CODE : MODEL_ROLE_CODE;
}

function clampInteger(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function dedupeNavigationDepthSamples(
    samples: readonly NavigationDepthSample[],
): readonly NavigationDepthSample[] {
    const deduped: NavigationDepthSample[] = [];

    for (const sample of samples) {
        if (
            deduped.some(
                (candidate) =>
                    Math.abs(candidate.canvasPoint.x - sample.canvasPoint.x) <= 1e-6 &&
                    Math.abs(candidate.canvasPoint.y - sample.canvasPoint.y) <= 1e-6,
            )
        ) {
            continue;
        }

        deduped.push(sample);
    }

    return deduped;
}
