const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_color;
in float a_alpha;
in float a_line_distance;
uniform mat4 u_matrix;
uniform float u_line_distance_scale;
uniform float u_point_size;
out vec4 v_color;
out float v_line_distance;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    gl_PointSize = u_point_size;
    v_color = vec4(a_color, a_alpha);
    v_line_distance = a_line_distance * u_line_distance_scale;
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec4 u_line_stipple;
uniform float u_point_shape;
in vec4 v_color;
in float v_line_distance;
out vec4 out_color;

bool isLineGap(float lineDistance, vec4 lineStipple) {
    float gapStart1 = lineStipple.x;
    float gapStop1 = gapStart1 + lineStipple.y;
    float gapStart2 = gapStop1 + lineStipple.z;
    float stippleLength = max(gapStart2 + lineStipple.w, 0.001);
    float stippleDistance = mod(lineDistance, stippleLength);

    return (stippleDistance > gapStart1 && stippleDistance < gapStop1) ||
        (stippleDistance > gapStart2 && stippleDistance < stippleLength);
}

void main() {
    if (u_point_shape > 3.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float alpha = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);

        if (alpha <= 0.0) {
            discard;
        }

        out_color = vec4(v_color.rgb, v_color.a * alpha);
        return;
    }

    if (u_point_shape > 2.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float outerEdge = 1.0 - smoothstep(0.44, 0.5, distanceFromCenter);
        float innerEdge = smoothstep(0.26, 0.32, distanceFromCenter);
        float alpha = outerEdge * innerEdge;

        if (alpha <= 0.0) {
            discard;
        }

        out_color = vec4(v_color.rgb, v_color.a * alpha);
        return;
    }

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

        out_color = vec4(v_color.rgb, v_color.a * alpha);
        return;
    }

    if (u_point_shape > 0.5) {
        vec2 pointCoord = gl_PointCoord - vec2(0.5);
        float distanceFromCenter = length(pointCoord);
        float edgeAlpha = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);

        if (edgeAlpha <= 0.0) {
            discard;
        }

        out_color = vec4(v_color.rgb, v_color.a * edgeAlpha);
        return;
    }

    if (isLineGap(v_line_distance, u_line_stipple)) {
        discard;
    }

    out_color = v_color;
}
`;

export function createProgram(context: WebGL2RenderingContext): WebGLProgram {
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

function createShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader {
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
