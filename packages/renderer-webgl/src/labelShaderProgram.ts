const labelVertexShaderSource = `#version 300 es
in vec3 a_position;
in vec2 a_uv;
in vec3 a_color;
in float a_alpha;
uniform mat4 u_matrix;
out vec2 v_uv;
out vec4 v_color;

void main() {
    gl_Position = u_matrix * vec4(a_position, 1.0);
    v_uv = a_uv;
    v_color = vec4(a_color, a_alpha);
}
`;

const labelFragmentShaderSource = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
in vec2 v_uv;
in vec4 v_color;
out vec4 out_color;

void main() {
    vec4 sampleColor = texture(u_texture, v_uv);
    float alpha = sampleColor.a * v_color.a;

    if (alpha <= 0.0) {
        discard;
    }

    out_color = vec4(v_color.rgb, alpha);
}
`;

export function createLabelProgram(context: WebGL2RenderingContext): WebGLProgram {
    const vertexShader = createShader(context, context.VERTEX_SHADER, labelVertexShaderSource);
    const fragmentShader = createShader(
        context,
        context.FRAGMENT_SHADER,
        labelFragmentShaderSource,
    );
    const program = context.createProgram();

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);

    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        const message = context.getProgramInfoLog(program) ?? 'Unknown link error';

        context.deleteProgram(program);
        throw new Error(`WebGL label shader program link failed: ${message}`);
    }

    context.deleteShader(vertexShader);
    context.deleteShader(fragmentShader);

    return program;
}

function createShader(context: WebGL2RenderingContext, type: number, source: string): WebGLShader {
    const shader = context.createShader(type);

    if (!shader) {
        throw new Error('WebGL label renderer initialization failed: cannot create shader.');
    }

    context.shaderSource(shader, source);
    context.compileShader(shader);

    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const message = context.getShaderInfoLog(shader) ?? 'Unknown compile error';

        context.deleteShader(shader);
        throw new Error(`WebGL label shader compile failed: ${message}`);
    }

    return shader;
}
