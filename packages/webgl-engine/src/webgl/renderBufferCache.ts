interface RenderBufferCacheEntry {
    buffer: WebGLBuffer;
    byteLength: number;
    itemCount: number;
    seenFrame: number;
}

export interface RenderBufferCacheStats {
    readonly entryCount: number;
    readonly releasedCount: number;
    readonly uploadCount: number;
}

export class RenderBufferCache {
    private frameIndex = 0;
    private readonly entries = new Map<string, RenderBufferCacheEntry>();
    private releasedCount = 0;
    private uploadCount = 0;

    constructor(private readonly context: WebGL2RenderingContext) {}

    public beginFrame(): void {
        this.frameIndex += 1;
    }

    public dispose(): void {
        for (const entry of this.entries.values()) {
            this.context.deleteBuffer(entry.buffer);
        }

        this.entries.clear();
    }

    public endFrame(): void {
        for (const [key, entry] of this.entries) {
            if (entry.seenFrame !== this.frameIndex) {
                this.context.deleteBuffer(entry.buffer);
                this.releasedCount += 1;
                this.entries.delete(key);
            }
        }
    }

    public getArrayBuffer(input: {
        readonly data: Float32Array;
        readonly dirty: boolean;
        readonly itemCount: number;
        readonly key: string;
        readonly usage?: number;
    }): WebGLBuffer {
        const cacheKey = input.key;
        let entry = this.entries.get(cacheKey);

        if (!entry) {
            const buffer = this.context.createBuffer();
            entry = {
                buffer,
                byteLength: 0,
                itemCount: 0,
                seenFrame: this.frameIndex,
            };
            this.entries.set(cacheKey, entry);
        }

        entry.seenFrame = this.frameIndex;

        if (
            input.dirty ||
            entry.byteLength !== input.data.byteLength ||
            entry.itemCount !== input.itemCount
        ) {
            this.context.bindBuffer(this.context.ARRAY_BUFFER, entry.buffer);
            this.context.bufferData(
                this.context.ARRAY_BUFFER,
                input.data,
                input.usage ?? this.context.STATIC_DRAW,
            );
            entry.byteLength = input.data.byteLength;
            entry.itemCount = input.itemCount;
            this.uploadCount += 1;
        }

        return entry.buffer;
    }

    public getStats(): RenderBufferCacheStats {
        return {
            entryCount: this.entries.size,
            releasedCount: this.releasedCount,
            uploadCount: this.uploadCount,
        };
    }
}
