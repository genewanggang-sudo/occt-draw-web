const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_color;
in float a_alpha;
in float a_line_distance;
in vec3 a_line_opposite_position;
in float a_line_side;
in float a_line_along;
uniform mat4 u_matrix;
uniform float u_line_distance_scale;
uniform float u_line_filter_width;
uniform float u_line_mode;
uniform float u_line_width;
uniform float u_point_size;
uniform vec2 u_viewport_size;
out vec4 v_color;
out float v_line_distance;
out float v_line_center_distance;
flat out float v_line_mode;

float safeClipW(float w) {
    return abs(w) < 0.000001 ? sign(w + 0.000001) * 0.000001 : w;
}

vec2 safeNormalize(vec2 value) {
    float lengthValue = length(value);

    return lengthValue < 0.000001 ? vec2(1.0, 0.0) : value / lengthValue;
}

void main() {
    vec4 projectedPosition = u_matrix * vec4(a_position, 1.0);
    gl_PointSize = u_point_size;
    v_color = vec4(a_color, a_alpha);
    v_line_distance = a_line_distance * u_line_distance_scale;
    v_line_center_distance = 0.0;
    v_line_mode = u_line_mode;

    if (u_line_mode > 0.5) {
        vec4 projectedOppositePosition = u_matrix * vec4(a_line_opposite_position, 1.0);
        vec2 positionNdc = projectedPosition.xy / safeClipW(projectedPosition.w);
        vec2 oppositePositionNdc =
            projectedOppositePosition.xy / safeClipW(projectedOppositePosition.w);
        vec2 lineDirection = a_line_along < 0.0
            ? safeNormalize(oppositePositionNdc - positionNdc)
            : safeNormalize(positionNdc - oppositePositionNdc);
        vec2 lineNormal = vec2(-lineDirection.y, lineDirection.x);
        float halfWidth = max(u_line_width * 0.5, 0.001);
        float filterWidth = max(u_line_filter_width, 0.0);
        float lineExtent = halfWidth + filterWidth;
        vec2 offsetPixels = lineNormal * a_line_side * lineExtent +
            lineDirection * a_line_along * halfWidth;
        vec2 offsetNdc = 2.0 * offsetPixels / max(u_viewport_size, vec2(1.0, 1.0));

        projectedPosition.xy += offsetNdc * projectedPosition.w;
        v_line_center_distance = a_line_side * lineExtent;
    }

    gl_Position = projectedPosition;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec4 u_line_stipple;
uniform float u_line_filter_width;
uniform float u_line_width;
uniform float u_point_shape;
in vec4 v_color;
in float v_line_distance;
in float v_line_center_distance;
flat in float v_line_mode;
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

    if (v_line_mode > 0.5) {
        float halfWidth = max(u_line_width * 0.5, 0.001);
        float filterWidth = max(u_line_filter_width, 0.001);
        float edgeAlpha =
            1.0 - smoothstep(halfWidth, halfWidth + filterWidth, abs(v_line_center_distance));

        if (edgeAlpha <= 0.0) {
            discard;
        }

        out_color = vec4(v_color.rgb, v_color.a * edgeAlpha);
        return;
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
