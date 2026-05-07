import { BBox3, type LineSegment3, type Vector3 } from '@occt-draw/math';
import type { GeometryBounds } from '../core';
import type { SurfaceTriangle } from '../types';

export type BufferAttributeSemantic = 'alpha' | 'color' | 'position';
export type BufferIndexData = Uint16Array | Uint32Array;
export const BufferIndexType = {
    Uint16: 'uint16',
    Uint32: 'uint32',
} as const;
export type BufferIndexType = (typeof BufferIndexType)[keyof typeof BufferIndexType];

export interface BufferAttributeLayout {
    readonly components: number;
    readonly offsetFloats: number;
    readonly semantic: BufferAttributeSemantic;
}

export interface VertexAttributeLayout {
    readonly attributes: readonly BufferAttributeLayout[];
    readonly strideFloats: number;
}

export interface GeometryDirtyRange {
    readonly firstVertex: number;
    readonly vertexCount: number;
}

export interface BufferIndex {
    readonly data: BufferIndexData;
    readonly type: BufferIndexType;
}

export interface GeometryBufferInput {
    readonly bounds: GeometryBounds;
    readonly dirtyRange?: GeometryDirtyRange;
    readonly index?: BufferIndex;
    readonly interleaved: Float32Array;
    readonly layout: VertexAttributeLayout;
    readonly vertexCount: number;
}

export class GeometryBuffer {
    public readonly bounds: GeometryBounds;
    public readonly dirtyRange: GeometryDirtyRange | null;
    public readonly index: BufferIndex | null;
    public readonly interleaved: Float32Array;
    public readonly layout: VertexAttributeLayout;
    public readonly vertexCount: number;

    constructor(input: GeometryBufferInput) {
        this.bounds = input.bounds;
        this.dirtyRange = input.dirtyRange ?? null;
        this.index = input.index ?? null;
        this.interleaved = input.interleaved;
        this.layout = input.layout;
        this.vertexCount = input.vertexCount;
    }
}

export const PositionVertexAttributeLayout: VertexAttributeLayout = {
    attributes: [{ components: 3, offsetFloats: 0, semantic: 'position' }],
    strideFloats: 3,
};

export class GeometryBufferBuilder {
    public points(points: readonly Vector3[]): GeometryBuffer {
        return this.positions(points);
    }

    public segments(segments: readonly LineSegment3[]): GeometryBuffer {
        const buffer = new PositionBufferWriter(segments.length * 2);

        for (const segment of segments) {
            buffer.write(segment.start);
            buffer.write(segment.end);
        }

        return buffer.toGeometryBuffer();
    }

    public triangles(triangles: readonly SurfaceTriangle[]): GeometryBuffer {
        const buffer = new PositionBufferWriter(triangles.length * 3);

        for (const triangle of triangles) {
            buffer.write(triangle.a);
            buffer.write(triangle.b);
            buffer.write(triangle.c);
        }

        return buffer.toGeometryBuffer();
    }

    public positions(points: readonly Vector3[]): GeometryBuffer {
        const buffer = new PositionBufferWriter(points.length);

        for (const point of points) {
            buffer.write(point);
        }

        return buffer.toGeometryBuffer();
    }
}

class PositionBufferWriter {
    private bounds: BBox3 | null = null;
    private offset = 0;
    private vertexCount = 0;
    private readonly data: Float32Array;

    constructor(vertexCapacity: number) {
        this.data = new Float32Array(vertexCapacity * PositionVertexAttributeLayout.strideFloats);
    }

    public write(position: Vector3): void {
        this.data[this.offset] = position.x;
        this.data[this.offset + 1] = position.y;
        this.data[this.offset + 2] = position.z;
        this.offset += PositionVertexAttributeLayout.strideFloats;
        this.vertexCount += 1;
        this.bounds = this.bounds
            ? this.bounds.expandByPoint(position)
            : new BBox3(position, position);
    }

    public toGeometryBuffer(): GeometryBuffer {
        return new GeometryBuffer({
            bounds: this.bounds,
            interleaved: this.data,
            layout: PositionVertexAttributeLayout,
            vertexCount: this.vertexCount,
        });
    }
}
