import { BBox3, Vec3, type LineSegment3, type Vector3 } from '@occt-draw/math';
import type { GeometryBounds } from '../core';
import type { SurfaceTriangle } from '../types';

export type BufferAttributeSemantic =
    | 'alpha'
    | 'color'
    | 'line-along'
    | 'line-distance'
    | 'line-opposite-position'
    | 'line-side'
    | 'position';
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

export const LineVertexAttributeLayout: VertexAttributeLayout = {
    attributes: [
        { components: 3, offsetFloats: 0, semantic: 'position' },
        { components: 1, offsetFloats: 3, semantic: 'line-distance' },
    ],
    strideFloats: 4,
};

export const ScreenSpaceLineVertexAttributeLayout: VertexAttributeLayout = {
    attributes: [
        { components: 3, offsetFloats: 0, semantic: 'position' },
        { components: 3, offsetFloats: 3, semantic: 'line-opposite-position' },
        { components: 1, offsetFloats: 6, semantic: 'line-distance' },
        { components: 1, offsetFloats: 7, semantic: 'line-side' },
        { components: 1, offsetFloats: 8, semantic: 'line-along' },
    ],
    strideFloats: 9,
};

export class GeometryBufferBuilder {
    public points(points: readonly Vector3[]): GeometryBuffer {
        return this.positions(points);
    }

    public segments(segments: readonly LineSegment3[]): GeometryBuffer {
        const buffer = new LineBufferWriter(segments.length * 2);
        let distance = 0;
        let previousEnd: Vector3 | null = null;

        for (const segment of segments) {
            if (previousEnd && Vec3.distance(previousEnd, segment.start) > 1e-7) {
                distance = 0;
            }

            buffer.write(segment.start, distance);
            distance += Vec3.distance(segment.start, segment.end);
            buffer.write(segment.end, distance);
            previousEnd = segment.end;
        }

        return buffer.toGeometryBuffer();
    }

    public screenSpaceLineSegments(segments: readonly LineSegment3[]): GeometryBuffer {
        const buffer = new ScreenSpaceLineBufferWriter(segments.length * 6);
        let distance = 0;
        let previousEnd: Vector3 | null = null;

        for (const segment of segments) {
            if (previousEnd && Vec3.distance(previousEnd, segment.start) > 1e-7) {
                distance = 0;
            }

            const segmentLength = Vec3.distance(segment.start, segment.end);
            const startDistance = distance;
            const endDistance = distance + segmentLength;
            distance = endDistance;
            previousEnd = segment.end;

            if (segmentLength <= 1e-9) {
                continue;
            }

            buffer.writeSegment(segment.start, segment.end, startDistance, endDistance);
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

class LineBufferWriter {
    private bounds: BBox3 | null = null;
    private offset = 0;
    private vertexCount = 0;
    private readonly data: Float32Array;

    constructor(vertexCapacity: number) {
        this.data = new Float32Array(vertexCapacity * LineVertexAttributeLayout.strideFloats);
    }

    public write(position: Vector3, lineDistance: number): void {
        this.data[this.offset] = position.x;
        this.data[this.offset + 1] = position.y;
        this.data[this.offset + 2] = position.z;
        this.data[this.offset + 3] = lineDistance;
        this.offset += LineVertexAttributeLayout.strideFloats;
        this.vertexCount += 1;
        this.bounds = this.bounds
            ? this.bounds.expandByPoint(position)
            : new BBox3(position, position);
    }

    public toGeometryBuffer(): GeometryBuffer {
        return new GeometryBuffer({
            bounds: this.bounds,
            interleaved: this.data,
            layout: LineVertexAttributeLayout,
            vertexCount: this.vertexCount,
        });
    }
}

class ScreenSpaceLineBufferWriter {
    private bounds: BBox3 | null = null;
    private offset = 0;
    private vertexCount = 0;
    private readonly data: Float32Array;

    constructor(vertexCapacity: number) {
        this.data = new Float32Array(
            vertexCapacity * ScreenSpaceLineVertexAttributeLayout.strideFloats,
        );
    }

    public writeSegment(
        start: Vector3,
        end: Vector3,
        startDistance: number,
        endDistance: number,
    ): void {
        this.write(start, end, startDistance, -1, -1);
        this.write(end, start, endDistance, -1, 1);
        this.write(end, start, endDistance, 1, 1);
        this.write(start, end, startDistance, -1, -1);
        this.write(end, start, endDistance, 1, 1);
        this.write(start, end, startDistance, 1, -1);
    }

    private write(
        position: Vector3,
        oppositePosition: Vector3,
        lineDistance: number,
        side: number,
        along: number,
    ): void {
        this.data[this.offset] = position.x;
        this.data[this.offset + 1] = position.y;
        this.data[this.offset + 2] = position.z;
        this.data[this.offset + 3] = oppositePosition.x;
        this.data[this.offset + 4] = oppositePosition.y;
        this.data[this.offset + 5] = oppositePosition.z;
        this.data[this.offset + 6] = lineDistance;
        this.data[this.offset + 7] = side;
        this.data[this.offset + 8] = along;
        this.offset += ScreenSpaceLineVertexAttributeLayout.strideFloats;
        this.vertexCount += 1;
        this.bounds = this.bounds
            ? this.bounds.expandByPoint(position)
            : new BBox3(position, position);
        this.bounds = this.bounds.expandByPoint(oppositePosition);
    }

    public toGeometryBuffer(): GeometryBuffer {
        return new GeometryBuffer({
            bounds: this.bounds,
            interleaved:
                this.vertexCount * ScreenSpaceLineVertexAttributeLayout.strideFloats ===
                this.data.length
                    ? this.data
                    : this.data.slice(
                          0,
                          this.vertexCount * ScreenSpaceLineVertexAttributeLayout.strideFloats,
                      ),
            layout: ScreenSpaceLineVertexAttributeLayout,
            vertexCount: this.vertexCount,
        });
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
