import type { RenderGraph } from './core';
import { cameraDepth01ToViewDepth, canvasDepthToWorld } from './camera';
import type {
    NavigationDepthRole,
    NavigationDepthSample,
    NavigationDepthGraphSampleInput,
    ScreenPoint2,
} from './types';
import { DEFAULT_TOLERANCE, Vec3, type Vector3 } from '@occt-draw/math';
import { createViewProjectionMatrix } from './matrix';
import { collectNavigationDepthGraphObjects, resolveNavigationDepthRole } from './graphTraversal';
import { EdgeSet, FaceSet, MarkerSet, PointSet } from './scene';
import { withWebglStateRestored } from './webgl';

interface NavigationDepthTarget {
    readonly depthTexture: WebGLTexture;
    readonly framebuffer: WebGLFramebuffer;
    readonly height: number;
    readonly roleTexture: WebGLTexture;
    readonly width: number;
}

interface NavigationDepthCache {
    readonly areaKind: NavigationDepthGraphSampleInput['area']['kind'];
    readonly camera: NavigationDepthGraphSampleInput['camera'];
    readonly graph: RenderGraph;
    readonly height: number;
    readonly includeSecondary: boolean;
    readonly targetSampleCount: number | null;
    readonly viewportHeight: number;
    readonly viewportWidth: number;
    readonly width: number;
}

interface NavigationDepthBatch {
    readonly mode: number;
    readonly pointShape: number;
    readonly pointSize: number;
    readonly pointFont: Vector3;
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
    readonly pointFontLocation: WebGLUniformLocation;
    readonly positionLocation: number;
    readonly program: WebGLProgram;
    readonly roleCodeLocation: WebGLUniformLocation;
    readonly vertexArray: WebGLVertexArrayObject;
}

const PRIMARY_ROLE_CODE = 64 / 255;
const SECONDARY_ROLE_CODE = 192 / 255;
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
uniform vec3 u_point_font;
uniform float u_point_size;

out vec4 out_role;

vec3 encodeDepth(float depth) {
    float scaledDepth = clamp(depth, 0.0, 1.0) * 16777215.0;
    float red = floor(scaledDepth / 65536.0);
    float green = floor((scaledDepth - red * 65536.0) / 256.0);
    float blue = floor(scaledDepth - red * 65536.0 - green * 256.0);

    return vec3(red, green, blue) / 255.0;
}

float getPointFontOpacity() {
    vec2 offset = (gl_PointCoord - vec2(0.5)) * u_point_size;
    float pointRadius = u_point_size * 0.5;
    float filterWidth = 1.0;
    float distanceFromCenter = length(offset);
    float radialSegmentCount = round(u_point_font.x);
    float angularSegmentCount = round(u_point_font.y);
    float ringFont = clamp(u_point_font.z / 100.0, 0.0, 1.0);
    float radialOpacity = 0.0;
    float radialColorMix = 0.0;

    if (radialSegmentCount > 0.0) {
        float radialStep = pointRadius / radialSegmentCount;
        float closestIndex = round(distanceFromCenter / radialStep);
        closestIndex = clamp(closestIndex, 1.0, radialSegmentCount);

        float closestBoundary = closestIndex * radialStep;
        float flip = 2.0 * mod(radialSegmentCount - closestIndex, 2.0) - 1.0;
        float fontAdjustment = mix(
            0.0,
            pointRadius / max(radialSegmentCount, 1.0) * (ringFont - 0.5) * 2.0,
            min(radialSegmentCount, 1.0)
        );
        float radialValue = smoothstep(
            -filterWidth,
            filterWidth,
            2.0 * (flip * (distanceFromCenter - closestBoundary) + fontAdjustment)
        );
        float isInside = clamp(radialSegmentCount - closestIndex, 0.0, 1.0);

        radialOpacity = mix(radialValue, 1.0, isInside);
        radialColorMix = mix(1.0, radialValue, isInside);
    }

    float angularOpacity = 0.0;

    if (angularSegmentCount > 0.0) {
        float angularSegmentWidth = 0.33 * pointRadius;
        float angle = atan(offset.y, offset.x);
        radialOpacity = min(radialOpacity, radialColorMix);

        float angleStep = 6.28318530718 / angularSegmentCount;
        float closestAngle = round(angle / angleStep) * angleStep;
        vec2 perpendicularDirection = vec2(-sin(closestAngle), cos(closestAngle));
        float perpendicularDistance = abs(dot(offset, perpendicularDirection));

        angularOpacity = smoothstep(
            -filterWidth,
            filterWidth,
            angularSegmentWidth - 2.0 * perpendicularDistance
        );
    }

    float perimeterOpacity = smoothstep(-filterWidth, 0.0, pointRadius - distanceFromCenter);
    float opacityScale = min(perimeterOpacity, max(angularOpacity, radialOpacity));
    float isEmpty = float(radialSegmentCount + angularSegmentCount == 0.0);

    return max(opacityScale, isEmpty);
}

void main() {
    if (u_point_shape > 2.5) {
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
        if (getPointFontOpacity() <= 0.0) {
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
    const pointFontLocation = context.getUniformLocation(program, 'u_point_font');

    if (
        positionLocation < 0 ||
        !matrixLocation ||
        !pointSizeLocation ||
        !pointShapeLocation ||
        !pointFontLocation ||
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
        pointFontLocation,
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
    input: NavigationDepthGraphSampleInput,
): readonly NavigationDepthSample[] {
    if (!hasNavigationDepthObjects(input.graph, input.includeSecondary)) {
        return [];
    }

    const targetSize = getNavigationDepthTargetSize(canvas, input);

    return withWebglStateRestored(context, () => {
        const target = ensureNavigationDepthTarget(
            context,
            resources,
            targetSize.width,
            targetSize.height,
        );

        if (shouldRenderNavigationDepth(resources.cache, target, input)) {
            renderNavigationDepth(context, resources, target, input);
            resources.cache = {
                areaKind: input.area.kind,
                camera: input.camera,
                graph: input.graph,
                height: target.height,
                includeSecondary: input.includeSecondary,
                targetSampleCount:
                    input.area.kind === 'viewport-grid' ? input.area.targetSampleCount : null,
                viewportHeight: input.viewportSize.height,
                viewportWidth: input.viewportSize.width,
                width: target.width,
            };
        }

        context.bindFramebuffer(context.FRAMEBUFFER, target.framebuffer);
        context.readBuffer(context.COLOR_ATTACHMENT0);

        return readNavigationDepthSamples(context, target, input);
    });
}

function getNavigationDepthTargetSize(
    canvas: HTMLCanvasElement,
    input: NavigationDepthGraphSampleInput,
): Pick<NavigationDepthTarget, 'height' | 'width'> {
    if (input.area.kind !== 'viewport-grid') {
        return {
            height: canvas.height,
            width: canvas.width,
        };
    }

    const viewportWidth = Math.max(input.viewportSize.width, 1);
    const viewportHeight = Math.max(input.viewportSize.height, 1);
    const targetSampleCount = Math.max(input.area.targetSampleCount, 1);
    const viewportSampleScale = Math.min(
        Math.sqrt(targetSampleCount / (viewportWidth * viewportHeight)),
        1,
    );
    const lowViewportWidth = Math.max(1, Math.ceil(viewportWidth * viewportSampleScale));
    const lowViewportHeight = Math.max(1, Math.ceil(viewportHeight * viewportSampleScale));
    const pixelRatioX = canvas.width / viewportWidth;
    const pixelRatioY = canvas.height / viewportHeight;

    return {
        height: Math.max(1, Math.ceil(lowViewportHeight * pixelRatioY)),
        width: Math.max(1, Math.ceil(lowViewportWidth * pixelRatioX)),
    };
}

function renderNavigationDepth(
    context: WebGL2RenderingContext,
    resources: NavigationDepthResources,
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): void {
    const matrix = createViewProjectionMatrix(input.camera, input.viewportSize);
    const batches = createNavigationDepthBatches(context, input.graph, input.includeSecondary);

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
        context.uniform3f(
            resources.pointFontLocation,
            batch.pointFont.x,
            batch.pointFont.y,
            batch.pointFont.z,
        );
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

function readNavigationDepthSamples(
    context: WebGL2RenderingContext,
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind === 'points') {
        return readPointSamples(context, target, input);
    }

    if (input.area.kind === 'rect') {
        return readRectSamples(context, target, input);
    }

    return readViewportGridSamples(context, target, input);
}

function readPointSamples(
    context: WebGL2RenderingContext,
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind !== 'points') {
        return [];
    }

    const samples: NavigationDepthSample[] = [];
    const pixel = new Uint8Array(4);
    const scaleX = target.width / Math.max(input.viewportSize.width, 1);
    const scaleY = target.height / Math.max(input.viewportSize.height, 1);

    for (const point of input.area.points) {
        const deviceX = clampInteger(Math.floor(point.x * scaleX), 0, target.width - 1);
        const deviceYFromTop = clampInteger(Math.floor(point.y * scaleY), 0, target.height - 1);
        const deviceY = target.height - 1 - deviceYFromTop;

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
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind !== 'rect') {
        return [];
    }

    const scaleX = target.width / Math.max(input.viewportSize.width, 1);
    const scaleY = target.height / Math.max(input.viewportSize.height, 1);
    const minDeviceX = clampInteger(
        Math.floor(Math.min(input.area.rect.minX, input.area.rect.maxX) * scaleX),
        0,
        target.width - 1,
    );
    const maxDeviceX = clampInteger(
        Math.ceil(Math.max(input.area.rect.minX, input.area.rect.maxX) * scaleX),
        minDeviceX + 1,
        target.width,
    );
    const minDeviceYFromTop = clampInteger(
        Math.floor(Math.min(input.area.rect.minY, input.area.rect.maxY) * scaleY),
        0,
        target.height - 1,
    );
    const maxDeviceYFromTop = clampInteger(
        Math.ceil(Math.max(input.area.rect.minY, input.area.rect.maxY) * scaleY),
        minDeviceYFromTop + 1,
        target.height,
    );
    const readWidth = maxDeviceX - minDeviceX;
    const readHeight = maxDeviceYFromTop - minDeviceYFromTop;
    const readY = target.height - maxDeviceYFromTop;
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

function readViewportGridSamples(
    context: WebGL2RenderingContext,
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): readonly NavigationDepthSample[] {
    if (input.area.kind !== 'viewport-grid') {
        return [];
    }

    const pixels = new Uint8Array(target.width * target.height * 4);
    const scaleX = target.width / Math.max(input.viewportSize.width, 1);
    const scaleY = target.height / Math.max(input.viewportSize.height, 1);
    const samples: NavigationDepthSample[] = [];

    context.readPixels(
        0,
        0,
        target.width,
        target.height,
        context.RGBA,
        context.UNSIGNED_BYTE,
        pixels,
    );

    for (let row = 0; row < target.height; row += 1) {
        const canvasY = (target.height - row - 0.5) / scaleY;

        for (let column = 0; column < target.width; column += 1) {
            const index = (row * target.width + column) * 4;
            const canvasPoint = {
                x: (column + 0.5) / scaleX,
                y: canvasY,
            };
            const sample = decodeNavigationDepthPixel(pixels, index, canvasPoint, input);

            if (sample) {
                samples.push(sample);
            }
        }
    }

    return samples;
}

function decodeNavigationDepthPixel(
    pixels: Uint8Array,
    index: number,
    canvasPoint: ScreenPoint2,
    input: NavigationDepthGraphSampleInput,
): NavigationDepthSample | null {
    const roleCode = pixels[index + 3] ?? 0;

    if (roleCode < 32) {
        return null;
    }

    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const depth01 = (red * 65536 + green * 256 + blue) / DEPTH_MAX_INT;
    const role = roleCode >= 128 ? 'secondary' : 'primary';

    if (!input.includeSecondary && role === 'secondary') {
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
    graph: RenderGraph,
    includeSecondary: boolean,
): readonly NavigationDepthBatch[] {
    const batches: NavigationDepthBatch[] = [];

    for (const { layer, object } of collectNavigationDepthGraphObjects(graph, includeSecondary)) {
        const role = resolveNavigationDepthRole(layer, object);

        if (role !== 'primary' && role !== 'secondary') {
            continue;
        }

        if (object instanceof FaceSet) {
            batches.push({
                mode: context.TRIANGLES,
                pointShape: 0,
                pointSize: 1,
                pointFont: Vec3.of(0, 0, 0),
                positions: object.geometry.triangles.flatMap((triangle) => [
                    triangle.a,
                    triangle.b,
                    triangle.c,
                ]),
                role,
            });
        } else if (object instanceof EdgeSet) {
            batches.push({
                mode: context.LINES,
                pointShape: 0,
                pointSize: 1,
                pointFont: Vec3.of(0, 0, 0),
                positions: object.geometry.segments.flatMap((segment) => [
                    segment.start,
                    segment.end,
                ]),
                role,
            });
        } else if (object instanceof PointSet) {
            batches.push({
                mode: context.POINTS,
                pointShape: 1,
                pointSize: object.style.sizePixels,
                pointFont: Vec3.of(
                    object.style.pointFont.radialSegmentCount,
                    object.style.pointFont.angularSegmentCount,
                    object.style.pointFont.ringFillPercent,
                ),
                positions: object.geometry.points,
                role,
            });
        } else if (object instanceof MarkerSet) {
            batches.push(...createMarkerBatches(context, object, role));
        }
    }

    return batches;
}

function createMarkerBatches(
    context: WebGL2RenderingContext,
    object: MarkerSet,
    role: NavigationDepthRole,
): readonly NavigationDepthBatch[] {
    return object.geometry.markers.map((marker) => ({
        mode: context.POINTS,
        pointShape: 3,
        pointSize: marker.sizePixels,
        pointFont: Vec3.of(1, 0, 50),
        positions: [marker.position],
        role,
    }));
}

function shouldRenderNavigationDepth(
    cache: NavigationDepthCache | null,
    target: NavigationDepthTarget,
    input: NavigationDepthGraphSampleInput,
): boolean {
    if (!cache) {
        return true;
    }

    return (
        cache.areaKind !== input.area.kind ||
        cache.camera !== input.camera ||
        cache.graph !== input.graph ||
        cache.includeSecondary !== input.includeSecondary ||
        cache.targetSampleCount !==
            (input.area.kind === 'viewport-grid' ? input.area.targetSampleCount : null) ||
        cache.viewportWidth !== input.viewportSize.width ||
        cache.viewportHeight !== input.viewportSize.height ||
        cache.width !== target.width ||
        cache.height !== target.height
    );
}

function hasNavigationDepthObjects(graph: RenderGraph, includeSecondary: boolean): boolean {
    return collectNavigationDepthGraphObjects(graph, includeSecondary).length > 0;
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
    return role === 'secondary' ? SECONDARY_ROLE_CODE : PRIMARY_ROLE_CODE;
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
                    Math.abs(candidate.canvasPoint.x - sample.canvasPoint.x) <=
                        DEFAULT_TOLERANCE.distance &&
                    Math.abs(candidate.canvasPoint.y - sample.canvasPoint.y) <=
                        DEFAULT_TOLERANCE.distance,
            )
        ) {
            continue;
        }

        deduped.push(sample);
    }

    return deduped;
}
