import { crossVector3, normalizeVector3, subtractVector3, type Vector3 } from '@occt-draw/math';
import type { CadRenderer, CameraState, RenderFrameInput, ViewportSize } from '@occt-draw/renderer';
import type { CubeWireframeSceneObject, SceneDocument } from '@occt-draw/scene';

export type RendererWebglModuleStatus = 'ready';

export interface RendererWebglModuleManifest {
    readonly name: '@occt-draw/renderer-webgl';
    readonly status: RendererWebglModuleStatus;
    readonly summary: string;
}

interface LineVertex {
    readonly color: Vector3;
    readonly position: Vector3;
}

type Matrix4 = Float32Array;

const vertexShaderSource = `
attribute vec3 a_position;
attribute vec3 a_color;
uniform mat4 u_matrix;
varying vec3 v_color;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    v_color = a_color;
}
`;

const fragmentShaderSource = `
precision mediump float;
varying vec3 v_color;

void main() {
    gl_FragColor = vec4(v_color, 1.0);
}
`;

export const RENDERER_WEBGL_MODULE_MANIFEST: RendererWebglModuleManifest = {
    name: '@occt-draw/renderer-webgl',
    status: 'ready',
    summary: 'WebGL 三维渲染后端，负责网格、边线、选择高亮和视窗绘制。',
};

export function getRendererWebglModuleManifest(): RendererWebglModuleManifest {
    return RENDERER_WEBGL_MODULE_MANIFEST;
}

export function createWebglRenderer(canvas: HTMLCanvasElement): CadRenderer {
    const context = canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        depth: true,
    });

    if (!context) {
        throw new Error('当前浏览器不支持 WebGL');
    }

    return new WebglCadRenderer(canvas, context);
}

class WebglCadRenderer implements CadRenderer {
    readonly #buffer: WebGLBuffer;
    readonly #canvas: HTMLCanvasElement;
    readonly #context: WebGLRenderingContext;
    readonly #matrixLocation: WebGLUniformLocation;
    readonly #positionLocation: number;
    readonly #colorLocation: number;
    readonly #program: WebGLProgram;

    constructor(canvas: HTMLCanvasElement, context: WebGLRenderingContext) {
        this.#canvas = canvas;
        this.#context = context;
        this.#program = createProgram(context);
        this.#positionLocation = context.getAttribLocation(this.#program, 'a_position');
        this.#colorLocation = context.getAttribLocation(this.#program, 'a_color');

        const matrixLocation = context.getUniformLocation(this.#program, 'u_matrix');

        if (!matrixLocation) {
            throw new Error('WebGL 渲染器初始化失败：缺少矩阵 uniform');
        }

        const buffer = context.createBuffer();

        this.#matrixLocation = matrixLocation;
        this.#buffer = buffer;

        context.enable(context.DEPTH_TEST);
        context.clearColor(0.035, 0.043, 0.055, 1);
    }

    dispose(): void {
        this.#context.deleteBuffer(this.#buffer);
        this.#context.deleteProgram(this.#program);
    }

    resize(viewportSize: ViewportSize): void {
        const pixelRatio = window.devicePixelRatio || 1;
        const nextWidth = Math.max(1, Math.floor(viewportSize.width * pixelRatio));
        const nextHeight = Math.max(1, Math.floor(viewportSize.height * pixelRatio));

        if (this.#canvas.width !== nextWidth || this.#canvas.height !== nextHeight) {
            this.#canvas.width = nextWidth;
            this.#canvas.height = nextHeight;
        }

        this.#context.viewport(0, 0, nextWidth, nextHeight);
    }

    render(input: RenderFrameInput): void {
        const context = this.#context;
        const vertices = createSceneLineVertices(input.scene);

        this.resize(input.viewportSize);

        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);
        context.useProgram(this.#program);
        context.bindBuffer(context.ARRAY_BUFFER, this.#buffer);
        context.bufferData(context.ARRAY_BUFFER, toVertexBuffer(vertices), context.STATIC_DRAW);

        const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

        context.enableVertexAttribArray(this.#positionLocation);
        context.vertexAttribPointer(this.#positionLocation, 3, context.FLOAT, false, stride, 0);
        context.enableVertexAttribArray(this.#colorLocation);
        context.vertexAttribPointer(
            this.#colorLocation,
            3,
            context.FLOAT,
            false,
            stride,
            3 * Float32Array.BYTES_PER_ELEMENT,
        );

        context.uniformMatrix4fv(
            this.#matrixLocation,
            false,
            multiplyMatrix4(
                createProjectionMatrix(input.camera, input.viewportSize),
                lookAtMatrix4(input.camera),
            ),
        );
        context.drawArrays(context.LINES, 0, vertices.length);
    }
}

function createSceneLineVertices(scene: SceneDocument): readonly LineVertex[] {
    const vertices: LineVertex[] = [];

    for (const object of scene.objects) {
        if (!object.visible) {
            continue;
        }

        if (object.kind === 'grid') {
            appendGrid(vertices, object.size, object.divisions);
            continue;
        }

        if (object.kind === 'axis') {
            appendAxis(vertices, object.length);
            continue;
        }

        appendCube(vertices, object);
    }

    return vertices;
}

function appendAxis(vertices: LineVertex[], length: number): void {
    appendLine(vertices, vector3(0, 0, 0), vector3(length, 0, 0), vector3(0.95, 0.2, 0.18));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, length, 0), vector3(0.2, 0.8, 0.32));
    appendLine(vertices, vector3(0, 0, 0), vector3(0, 0, length), vector3(0.28, 0.55, 1));
}

function appendGrid(vertices: LineVertex[], size: number, divisions: number): void {
    const halfSize = size / 2;
    const step = size / divisions;
    const color = vector3(0.24, 0.3, 0.36);

    for (let index = 0; index <= divisions; index += 1) {
        const offset = -halfSize + index * step;
        const lineColor = index === divisions / 2 ? vector3(0.42, 0.49, 0.58) : color;

        appendLine(
            vertices,
            vector3(-halfSize, 0, offset),
            vector3(halfSize, 0, offset),
            lineColor,
        );
        appendLine(
            vertices,
            vector3(offset, 0, -halfSize),
            vector3(offset, 0, halfSize),
            lineColor,
        );
    }
}

function appendCube(vertices: LineVertex[], cube: CubeWireframeSceneObject): void {
    const halfSize = cube.size / 2;
    const color = vector3(0.92, 0.74, 0.34);
    const points = [
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z - halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z - halfSize),
        vector3(cube.center.x - halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y - halfSize, cube.center.z + halfSize),
        vector3(cube.center.x + halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
        vector3(cube.center.x - halfSize, cube.center.y + halfSize, cube.center.z + halfSize),
    ] as const;
    const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
    ] as const;

    for (const [startIndex, endIndex] of edges) {
        appendLine(vertices, points[startIndex], points[endIndex], color);
    }
}

function appendLine(vertices: LineVertex[], start: Vector3, end: Vector3, color: Vector3): void {
    vertices.push({ position: start, color }, { position: end, color });
}

function toVertexBuffer(vertices: readonly LineVertex[]): Float32Array {
    const values: number[] = [];

    for (const vertex of vertices) {
        values.push(
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.color.x,
            vertex.color.y,
            vertex.color.z,
        );
    }

    return new Float32Array(values);
}

function createProgram(context: WebGLRenderingContext): WebGLProgram {
    const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
    const program = context.createProgram();

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const message = context.getProgramInfoLog(program) ?? '未知链接错误';

        context.deleteProgram(program);
        throw new Error(`WebGL 着色器程序链接失败：${message}`);
    }

    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);

    return program;
}

function createShader(context: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = context.createShader(type);

    if (!shader) {
        throw new Error('WebGL 渲染器初始化失败：无法创建着色器');
    }

    context.shaderSource(shader, source);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const message = context.getShaderInfoLog(shader) ?? '未知编译错误';

        context.deleteShader(shader);
        throw new Error(`WebGL 着色器编译失败：${message}`);
    }

    return shader;
}

function createProjectionMatrix(camera: CameraState, viewportSize: ViewportSize): Matrix4 {
    const aspect = viewportSize.width / viewportSize.height;

    if (camera.projection === 'orthographic') {
        return orthographicMatrix4(camera.orthographicHeight, aspect, camera.near, camera.far);
    }

    return perspectiveMatrix4(camera.fovYRadians, aspect, camera.near, camera.far);
}

function orthographicMatrix4(height: number, aspect: number, near: number, far: number): Matrix4 {
    const halfHeight = height / 2;
    const halfWidth = halfHeight * aspect;
    const left = -halfWidth;
    const right = halfWidth;
    const bottom = -halfHeight;
    const top = halfHeight;

    return new Float32Array([
        2 / (right - left),
        0,
        0,
        0,
        0,
        2 / (top - bottom),
        0,
        0,
        0,
        0,
        2 / (near - far),
        0,
        (left + right) / (left - right),
        (bottom + top) / (bottom - top),
        (near + far) / (near - far),
        1,
    ]);
}

function perspectiveMatrix4(
    fovYRadians: number,
    aspect: number,
    near: number,
    far: number,
): Matrix4 {
    const f = 1 / Math.tan(fovYRadians / 2);
    const rangeInverse = 1 / (near - far);

    return new Float32Array([
        f / aspect,
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (near + far) * rangeInverse,
        -1,
        0,
        0,
        near * far * rangeInverse * 2,
        0,
    ]);
}

function lookAtMatrix4(camera: CameraState): Matrix4 {
    const zAxis = normalizeVector3(subtractVector3(camera.position, camera.target));
    const xAxis = normalizeVector3(crossVector3(camera.up, zAxis));
    const yAxis = crossVector3(zAxis, xAxis);

    return new Float32Array([
        xAxis.x,
        yAxis.x,
        zAxis.x,
        0,
        xAxis.y,
        yAxis.y,
        zAxis.y,
        0,
        xAxis.z,
        yAxis.z,
        zAxis.z,
        0,
        -dot(xAxis, camera.position),
        -dot(yAxis, camera.position),
        -dot(zAxis, camera.position),
        1,
    ]);
}

function multiplyMatrix4(left: Matrix4, right: Matrix4): Matrix4 {
    const output = new Float32Array(16);

    for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
            output[column * 4 + row] =
                matrixValue(left, row) * matrixValue(right, column * 4) +
                matrixValue(left, 4 + row) * matrixValue(right, column * 4 + 1) +
                matrixValue(left, 8 + row) * matrixValue(right, column * 4 + 2) +
                matrixValue(left, 12 + row) * matrixValue(right, column * 4 + 3);
        }
    }

    return output;
}

function matrixValue(matrix: Matrix4, index: number): number {
    return matrix[index] ?? 0;
}

function dot(left: Vector3, right: Vector3): number {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

function vector3(x: number, y: number, z: number): Vector3 {
    return { x, y, z };
}
