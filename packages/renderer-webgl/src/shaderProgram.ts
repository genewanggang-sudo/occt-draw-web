const vertexShaderSource = `
attribute vec3 a_position;
attribute vec3 a_color;
attribute float a_alpha;
uniform mat4 u_matrix;
uniform float u_point_size;
varying vec4 v_color;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    gl_PointSize = u_point_size;
    v_color = vec4(a_color, a_alpha);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform float u_point_shape;
varying vec4 v_color;

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

        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
        return;
    }

    if (u_point_shape > 0.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float edgeAlpha = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);

        if (edgeAlpha <= 0.0) {
            discard;
        }

        gl_FragColor = vec4(v_color.rgb, v_color.a * edgeAlpha);
        return;
    }

    gl_FragColor = v_color;
}
`;

export function createProgram(context: WebGLRenderingContext): WebGLProgram {
    const vertexShader = createShader(context, context.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(context, context.FRAGMENT_SHADER, fragmentShaderSource);
    const program = context.createProgram();

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const message = context.getProgramInfoLog(program) ?? 'Unknown link error';

        context.deleteProgram(program);
        throw new Error(`WebGL shader program link failed: ${message}`);
    }

    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);

    return program;
}

function createShader(context: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = context.createShader(type);

    if (!shader) {
        throw new Error('WebGL renderer initialization failed: cannot create shader.');
    }

    context.shaderSource(shader, source);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const message = context.getShaderInfoLog(shader) ?? 'Unknown compile error';

        context.deleteShader(shader);
        throw new Error(`WebGL shader compile failed: ${message}`);
    }

    return shader;
}
