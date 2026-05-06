export function createRenderVertexArray(
    context: WebGL2RenderingContext,
    input: {
        readonly alphaLocation: number;
        readonly buffer: WebGLBuffer;
        readonly colorLocation: number;
        readonly positionLocation: number;
    },
): WebGLVertexArrayObject {
    const vertexArray = context.createVertexArray();
    const stride = 7 * Float32Array.BYTES_PER_ELEMENT;

    context.bindVertexArray(vertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, input.buffer);
    context.enableVertexAttribArray(input.positionLocation);
    context.vertexAttribPointer(input.positionLocation, 3, context.FLOAT, false, stride, 0);
    context.enableVertexAttribArray(input.colorLocation);
    context.vertexAttribPointer(
        input.colorLocation,
        3,
        context.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(input.alphaLocation);
    context.vertexAttribPointer(
        input.alphaLocation,
        1,
        context.FLOAT,
        false,
        stride,
        6 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.bindVertexArray(null);
    context.bindBuffer(context.ARRAY_BUFFER, null);

    return vertexArray;
}

export function createLabelVertexArray(
    context: WebGL2RenderingContext,
    input: {
        readonly labelAlphaLocation: number;
        readonly labelBuffer: WebGLBuffer;
        readonly labelColorLocation: number;
        readonly labelPositionLocation: number;
        readonly labelUvLocation: number;
    },
): WebGLVertexArrayObject {
    const vertexArray = context.createVertexArray();
    const stride = 9 * Float32Array.BYTES_PER_ELEMENT;

    context.bindVertexArray(vertexArray);
    context.bindBuffer(context.ARRAY_BUFFER, input.labelBuffer);
    context.enableVertexAttribArray(input.labelPositionLocation);
    context.vertexAttribPointer(input.labelPositionLocation, 3, context.FLOAT, false, stride, 0);
    context.enableVertexAttribArray(input.labelUvLocation);
    context.vertexAttribPointer(
        input.labelUvLocation,
        2,
        context.FLOAT,
        false,
        stride,
        3 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(input.labelColorLocation);
    context.vertexAttribPointer(
        input.labelColorLocation,
        3,
        context.FLOAT,
        false,
        stride,
        5 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.enableVertexAttribArray(input.labelAlphaLocation);
    context.vertexAttribPointer(
        input.labelAlphaLocation,
        1,
        context.FLOAT,
        false,
        stride,
        8 * Float32Array.BYTES_PER_ELEMENT,
    );
    context.bindVertexArray(null);
    context.bindBuffer(context.ARRAY_BUFFER, null);

    return vertexArray;
}
