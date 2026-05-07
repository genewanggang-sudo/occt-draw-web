export interface WebGLDisposable {
    dispose(): void;
}

export class WebGLResourceRegistry {
    private readonly buffers: WebGLBuffer[] = [];
    private disposed = false;
    private readonly disposables: WebGLDisposable[] = [];
    private readonly programs: WebGLProgram[] = [];
    private readonly vertexArrays: WebGLVertexArrayObject[] = [];

    constructor(private readonly context: WebGL2RenderingContext) {}

    public dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        for (const disposable of this.disposables) {
            disposable.dispose();
        }

        for (const vertexArray of this.vertexArrays) {
            this.context.deleteVertexArray(vertexArray);
        }

        for (const buffer of this.buffers) {
            this.context.deleteBuffer(buffer);
        }

        for (const program of this.programs) {
            this.context.deleteProgram(program);
        }

        this.disposables.length = 0;
        this.vertexArrays.length = 0;
        this.buffers.length = 0;
        this.programs.length = 0;
    }

    public registerBuffer(buffer: WebGLBuffer): WebGLBuffer {
        this.buffers.push(buffer);

        return buffer;
    }

    public registerDisposable<T extends WebGLDisposable>(disposable: T): T {
        this.disposables.push(disposable);

        return disposable;
    }

    public registerProgram(program: WebGLProgram): WebGLProgram {
        this.programs.push(program);

        return program;
    }

    public registerVertexArray(vertexArray: WebGLVertexArrayObject): WebGLVertexArrayObject {
        this.vertexArrays.push(vertexArray);

        return vertexArray;
    }
}
