const vertexShaderSource = `#version 300 es
in vec3 a_position;
in vec3 a_color;
in float a_alpha;
in float a_line_distance;
in vec4 a_line_edge_data;
in float a_line_edge_length;
in float a_line_primitive_size;
in vec4 a_line_primitive_style;
uniform mat4 u_matrix;
uniform float u_device_pixel_ratio;
uniform float u_is_orthographic;
uniform float u_line_distance_scale;
uniform float u_line_filter_width;
uniform float u_line_mode;
uniform vec4 u_line_stipple;
uniform float u_line_width;
uniform float u_point_size;
uniform float u_projection_scale;
uniform vec2 u_viewport_size;
out vec4 v_color;
out float v_line_distance;
out float v_line_center_distance;
out vec4 v_line_stipple;
out float v_line_width;
flat out float v_line_mode;

float safeClipW(float w) {
    return abs(w) < 0.000001 ? sign(w + 0.000001) * 0.000001 : w;
}

vec2 safeNormalize(vec2 value) {
    float lengthValue = length(value);

    return lengthValue < 0.000001 ? vec2(1.0, 0.0) : value / lengthValue;
}

float impulse(float expected, float actual) {
    return 1.0 - step(0.5, abs(actual - expected));
}

float edgeCornerIndex() {
    return round(length(a_line_edge_data.xyz));
}

float edgeNormalDirectionFlag(float cornerIndex) {
    return -impulse(1.0, cornerIndex) - impulse(2.0, cornerIndex) +
        impulse(3.0, cornerIndex) + impulse(4.0, cornerIndex);
}

float edgeTangentDirectionFlag(float cornerIndex) {
    return -impulse(1.0, cornerIndex) + impulse(2.0, cornerIndex) +
        impulse(3.0, cornerIndex) - impulse(4.0, cornerIndex);
}

bool edgeIsInfinite() {
    return a_line_edge_data.w < 0.0;
}

float edgeLength() {
    return abs(a_line_edge_data.w) - 1.0;
}

void computeTangentAndNormalOffsets(
    vec4 projectedPosition,
    float lineWidth,
    out vec2 tangentOffset,
    out vec2 normalOffset
) {
    vec3 edgeDirection = normalize(a_line_edge_data.xyz);
    float cornerIndex = edgeCornerIndex();
    float normalDirectionFlag = edgeNormalDirectionFlag(cornerIndex);
    float tangentDirectionFlag = edgeTangentDirectionFlag(cornerIndex);
    vec4 projectedDirection = u_matrix * vec4(edgeDirection, 0.0);

    tangentOffset = vec2(0.0, 0.0);

    vec2 screenTangent;
    if (u_is_orthographic > 0.5) {
        vec2 screenNormal = safeNormalize(
            vec2(u_viewport_size.y, u_viewport_size.x) *
                vec2(-projectedDirection.y, projectedDirection.x)
        );
        screenTangent = vec2(screenNormal.y, -screenNormal.x);

        if (edgeIsInfinite()) {
            tangentOffset =
                tangentDirectionFlag * (length(projectedPosition.xy) + 2.0) *
                safeNormalize(projectedDirection.xy);
        }
    } else {
        float flip = sign(projectedPosition.w + projectedDirection.w);
        vec4 projectedEnd = projectedPosition + flip * projectedDirection;
        vec2 positionNdc = projectedPosition.xy / safeClipW(projectedPosition.w);
        vec2 endNdc = projectedEnd.xy / safeClipW(projectedEnd.w);
        screenTangent = safeNormalize(flip * (endNdc - positionNdc) * u_viewport_size);

        if (edgeIsInfinite()) {
            vec2 positionNdc = projectedPosition.xy / safeClipW(projectedPosition.w);
            vec2 screenPosition = (positionNdc + vec2(1.0, 1.0)) * u_viewport_size;
            vec2 screenOffset =
                tangentDirectionFlag * (length(screenPosition) + length(u_viewport_size)) *
                screenTangent;
            tangentOffset = projectedPosition.w * screenOffset / u_viewport_size;
        }
    }

    vec2 screenNormal = vec2(-screenTangent.y, screenTangent.x);
    normalOffset =
        projectedPosition.w * lineWidth * normalDirectionFlag * screenNormal / u_viewport_size;
}

void main() {
    vec4 projectedPosition = u_matrix * vec4(a_position, 1.0);
    gl_PointSize = u_point_size;
    v_color = vec4(a_color, a_alpha);
    v_line_distance = a_line_distance * u_line_distance_scale;
    if (u_line_mode < -0.5) {
        v_line_distance = a_line_edge_length * u_line_distance_scale;
    }
    v_line_center_distance = 0.0;
    v_line_stipple = u_line_stipple;
    v_line_width = u_line_width;
    v_line_mode = u_line_mode;

    if (u_line_mode > 0.5) {
        float lineWidth = max(u_device_pixel_ratio * a_line_primitive_size, 0.001);
        float filterWidth = max(u_line_filter_width, 0.0);
        float expandedLineWidth = lineWidth + filterWidth * 1.41421356237;
        float worldToPixel =
            abs(u_projection_scale / safeClipW(projectedPosition.w)) * 0.5 * u_viewport_size.x;
        vec2 tangentOffset;
        vec2 normalOffset;

        computeTangentAndNormalOffsets(
            projectedPosition,
            expandedLineWidth,
            tangentOffset,
            normalOffset
        );
        projectedPosition.xy += tangentOffset + normalOffset;

        v_line_center_distance = 0.5 * expandedLineWidth * edgeNormalDirectionFlag(edgeCornerIndex());
        v_line_distance = edgeIsInfinite() ? 0.0 : edgeLength() * worldToPixel;
        v_line_stipple = a_line_primitive_style;
        v_line_width = lineWidth;
    }
    gl_Position = projectedPosition;
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec4 u_line_stipple;
uniform lowp vec4 u_background_color;
uniform mediump float u_background_mix_proportion;
uniform float u_line_filter_width;
uniform float u_line_width;
uniform vec3 u_point_font;
uniform float u_point_shape;
uniform float u_point_size;
uniform vec3 u_point_stroke_color;
uniform float u_point_stroke_width;
in vec4 v_color;
in float v_line_distance;
in float v_line_center_distance;
in vec4 v_line_stipple;
in float v_line_width;
flat in float v_line_mode;
out vec4 out_color;

float impulse(float expected, float actual) {
    return 1.0 - step(0.5, abs(actual - expected));
}

bool isLineGap(float lineDistance, vec4 lineStipple) {
    float gapStart1 = lineStipple.x;
    float gapStop1 = gapStart1 + lineStipple.y;
    float gapStart2 = gapStop1 + lineStipple.z;
    float stippleLength = gapStart2 + lineStipple.w;
    float stippleDistance = mod(lineDistance, stippleLength + impulse(0.0, stippleLength));

    return (stippleDistance > gapStart1 && stippleDistance < gapStop1) ||
        (stippleDistance > gapStart2 && stippleDistance < stippleLength);
}

vec4 getPointFontColor(vec4 pointColor, vec4 backgroundColor) {
    pointColor = u_point_stroke_width < 0.0 ? vec4(u_point_stroke_color, pointColor.a) : pointColor;
    vec2 offset = (gl_PointCoord - vec2(0.5)) * u_point_size;
    float pointRadius = u_point_size * 0.5;
    float filterWidth = max(u_line_filter_width, 0.001);
    float angularSegmentWidth = 0.33 * pointRadius;
    float distanceFromCenter = length(offset);
    float angle = atan(offset.y, offset.x);
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
        radialOpacity = min(radialOpacity, radialColorMix);
        radialColorMix = 1.0;

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
    float colorScale = max(angularOpacity, radialColorMix);
    float isEmpty = float(radialSegmentCount + angularSegmentCount == 0.0);

    opacityScale = max(opacityScale, isEmpty);
    colorScale = max(colorScale, isEmpty);

    vec4 mixedColor = mix(backgroundColor, pointColor, colorScale);
    mixedColor.a *= clamp(opacityScale, 0.0, 1.0);

    return mixedColor;
}

void main() {
    vec2 pointCoord = gl_PointCoord;

    if (u_point_shape > 3.5) {
        vec2 centeredPointCoord = pointCoord - vec2(0.5);
        float distanceFromCenter = length(centeredPointCoord);
        float alpha = 1.0 - smoothstep(0.42, 0.5, distanceFromCenter);

        if (alpha <= 0.0) {
            discard;
        }

        out_color = vec4(v_color.rgb, v_color.a * alpha);
        return;
    }

    if (u_point_shape > 2.5) {
        vec2 centeredPointCoord = pointCoord - vec2(0.5);
        float distanceFromCenter = length(centeredPointCoord);
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
        out_color = getPointFontColor(v_color, u_background_color);

        if (out_color.a <= 0.0) {
            discard;
        }
        return;
    }

    if (isLineGap(v_line_distance, v_line_stipple)) {
        discard;
    }

    if (v_line_mode > 0.5) {
        float halfWidth = max(v_line_width * 0.5, 0.001);
        float filterWidth = max(u_line_filter_width, 0.001);
        float edgeAlpha =
            1.0 - smoothstep(halfWidth, halfWidth + filterWidth, abs(v_line_center_distance));

        if (edgeAlpha <= 0.0) {
            discard;
        }

        vec3 edgeColor = mix(v_color.rgb, u_background_color.rgb, u_background_mix_proportion);
        out_color = vec4(edgeColor, v_color.a * edgeAlpha);
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
