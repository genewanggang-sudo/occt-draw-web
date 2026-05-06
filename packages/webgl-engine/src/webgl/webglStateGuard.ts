export interface WebglStateSnapshot {
    readonly activeTexture: number;
    readonly arrayBuffer: WebGLBuffer | null;
    readonly blendEnabled: boolean;
    readonly clearColor: Float32Array;
    readonly cullFaceEnabled: boolean;
    readonly depthFunc: number;
    readonly depthMask: boolean;
    readonly depthTestEnabled: boolean;
    readonly drawFramebuffer: WebGLFramebuffer | null;
    readonly program: WebGLProgram | null;
    readonly readBuffer: number;
    readonly readFramebuffer: WebGLFramebuffer | null;
    readonly texture2D: WebGLTexture | null;
    readonly vertexArray: WebGLVertexArrayObject | null;
    readonly viewport: Int32Array;
}

export function captureWebglState(context: WebGL2RenderingContext): WebglStateSnapshot {
    return {
        activeTexture: context.getParameter(context.ACTIVE_TEXTURE) as number,
        arrayBuffer: context.getParameter(context.ARRAY_BUFFER_BINDING) as WebGLBuffer | null,
        blendEnabled: context.isEnabled(context.BLEND),
        clearColor: context.getParameter(context.COLOR_CLEAR_VALUE) as Float32Array,
        cullFaceEnabled: context.isEnabled(context.CULL_FACE),
        depthFunc: context.getParameter(context.DEPTH_FUNC) as number,
        depthMask: context.getParameter(context.DEPTH_WRITEMASK) as boolean,
        depthTestEnabled: context.isEnabled(context.DEPTH_TEST),
        drawFramebuffer: context.getParameter(
            context.DRAW_FRAMEBUFFER_BINDING,
        ) as WebGLFramebuffer | null,
        program: context.getParameter(context.CURRENT_PROGRAM) as WebGLProgram | null,
        readBuffer: context.getParameter(context.READ_BUFFER) as number,
        readFramebuffer: context.getParameter(
            context.READ_FRAMEBUFFER_BINDING,
        ) as WebGLFramebuffer | null,
        texture2D: context.getParameter(context.TEXTURE_BINDING_2D) as WebGLTexture | null,
        vertexArray: context.getParameter(
            context.VERTEX_ARRAY_BINDING,
        ) as WebGLVertexArrayObject | null,
        viewport: context.getParameter(context.VIEWPORT) as Int32Array,
    };
}

export function restoreWebglState(
    context: WebGL2RenderingContext,
    state: WebglStateSnapshot,
): void {
    context.bindFramebuffer(context.READ_FRAMEBUFFER, state.readFramebuffer);
    context.readBuffer(state.readBuffer);
    context.bindFramebuffer(context.DRAW_FRAMEBUFFER, state.drawFramebuffer);
    context.viewport(
        state.viewport[0] ?? 0,
        state.viewport[1] ?? 0,
        state.viewport[2] ?? 1,
        state.viewport[3] ?? 1,
    );
    context.clearColor(
        state.clearColor[0] ?? 0,
        state.clearColor[1] ?? 0,
        state.clearColor[2] ?? 0,
        state.clearColor[3] ?? 1,
    );
    context.depthMask(state.depthMask);
    context.depthFunc(state.depthFunc);
    setCapability(context, context.BLEND, state.blendEnabled);
    setCapability(context, context.CULL_FACE, state.cullFaceEnabled);
    setCapability(context, context.DEPTH_TEST, state.depthTestEnabled);
    context.useProgram(state.program);
    context.bindVertexArray(state.vertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, state.arrayBuffer);
    context.activeTexture(state.activeTexture);
    context.bindTexture(context.TEXTURE_2D, state.texture2D);
}

export function withWebglStateRestored<T>(context: WebGL2RenderingContext, run: () => T): T {
    const state = captureWebglState(context);

    try {
        return run();
    } finally {
        restoreWebglState(context, state);
    }
}

function setCapability(
    context: WebGL2RenderingContext,
    capability: number,
    enabled: boolean,
): void {
    if (enabled) {
        context.enable(capability);
    } else {
        context.disable(capability);
    }
}
