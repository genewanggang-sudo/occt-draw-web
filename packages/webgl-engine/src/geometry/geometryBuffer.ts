import { BBox3, Vec3, type LineSegment3, type Vector3 } from '@occt-draw/math';
import type { GeometryBounds } from '../core';
import type { SurfaceTriangle } from '../types';

export type BufferAttributeSemantic =
    | 'alpha'
    | 'color'
    | 'line-edge-data'
    | 'line-edge-length'
    | 'line-primitive-size'
    | 'line-primitive-style'
    | 'line-distance'
    | 'point-corner'
    | 'position';
export type BufferIndexData = Uint16Array | Uint32Array;
export const BufferIndexType = {
    Uint16: 'uint16',
    Uint32: 'uint32',
} as const;
export type BufferIndexType = (typeof BufferIndexType)[keyof typeof BufferIndexType];

export interface BufferAttributeLayout {
    readonly components: number;
    readonly normalized?: boolean;
    readonly offsetBytes?: number;
    readonly offsetFloats: number;
    readonly semantic: BufferAttributeSemantic;
    readonly type?: 'float' | 'uint8';
}

export interface VertexAttributeLayout {
    readonly attributes: readonly BufferAttributeLayout[];
    readonly strideBytes?: number;
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

export const PointBillboardVertexAttributeLayout: VertexAttributeLayout = {
    attributes: [
        { components: 3, offsetFloats: 0, semantic: 'position' },
        { components: 1, offsetFloats: 3, semantic: 'point-corner' },
    ],
    strideFloats: 4,
};

export const ScreenSpaceLineVertexAttributeLayout: VertexAttributeLayout = {
    attributes: [
        { components: 3, offsetFloats: 0, semantic: 'position' },
        { components: 4, offsetFloats: 3, semantic: 'line-edge-data' },
        { components: 1, offsetFloats: 7, semantic: 'line-edge-length' },
        { components: 1, offsetFloats: 8, semantic: 'line-primitive-size' },
        {
            components: 4,
            normalized: false,
            offsetBytes: 9 * Float32Array.BYTES_PER_ELEMENT,
            offsetFloats: 9,
            semantic: 'line-primitive-style',
            type: 'uint8',
        },
    ],
    strideBytes: 9 * Float32Array.BYTES_PER_ELEMENT + 4 * Uint8Array.BYTES_PER_ELEMENT,
    strideFloats: 10,
};

export interface ScreenSpaceLineStyleInput {
    readonly stipple: readonly [number, number, number, number];
    readonly widthPx: number;
}

export class GeometryBufferBuilder {
    public points(points: readonly Vector3[]): GeometryBuffer {
        return this.positions(points);
    }

    public screenSpacePointBillboards(points: readonly Vector3[]): GeometryBuffer {
        const buffer = new PointBillboardBufferWriter(points.length * 6);

        for (const point of points) {
            buffer.writePoint(point);
        }

        return buffer.toGeometryBuffer();
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

    public screenSpaceLineSegments(
        segments: readonly LineSegment3[],
        style: ScreenSpaceLineStyleInput,
    ): GeometryBuffer {
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

            buffer.writeSegment(segment.start, segment.end, startDistance, endDistance, style);
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
    private readonly bytes: Uint8Array;
    private readonly data: Float32Array;
    private readonly styleData: Uint8Array;

    constructor(vertexCapacity: number) {
        const strideBytes = ScreenSpaceLineVertexAttributeLayout.strideBytes;

        if (!strideBytes) {
            throw new Error('Screen-space line layout requires a byte stride.');
        }

        this.bytes = new Uint8Array(vertexCapacity * strideBytes);
        this.data = new Float32Array(
            this.bytes.buffer,
            this.bytes.byteOffset,
            vertexCapacity * ScreenSpaceLineVertexAttributeLayout.strideFloats,
        );
        this.styleData = new Uint8Array(this.bytes.buffer, this.bytes.byteOffset);
    }

    public writeSegment(
        start: Vector3,
        end: Vector3,
        startDistance: number,
        endDistance: number,
        style: ScreenSpaceLineStyleInput,
    ): void {
        const direction = Vec3.normalize(Vec3.subtract(end, start));
        const segmentLength = Vec3.distance(start, end);

        this.write(start, direction, segmentLength, startDistance, 1, style);
        this.write(end, direction, segmentLength, endDistance, 2, style);
        this.write(end, direction, segmentLength, endDistance, 3, style);
        this.write(start, direction, segmentLength, startDistance, 1, style);
        this.write(end, direction, segmentLength, endDistance, 3, style);
        this.write(start, direction, segmentLength, startDistance, 4, style);
    }

    private write(
        position: Vector3,
        direction: Vector3,
        segmentLength: number,
        edgeLength: number,
        cornerIndex: number,
        style: ScreenSpaceLineStyleInput,
    ): void {
        this.data[this.offset] = position.x;
        this.data[this.offset + 1] = position.y;
        this.data[this.offset + 2] = position.z;
        this.data[this.offset + 3] = direction.x * cornerIndex;
        this.data[this.offset + 4] = direction.y * cornerIndex;
        this.data[this.offset + 5] = direction.z * cornerIndex;
        this.data[this.offset + 6] = edgeLength + 1;
        this.data[this.offset + 7] = edgeLength;
        this.data[this.offset + 8] = style.widthPx;
        this.writeStyle(style);
        this.offset += ScreenSpaceLineVertexAttributeLayout.strideFloats;
        this.vertexCount += 1;
        this.bounds = this.bounds
            ? this.bounds.expandByPoint(position)
            : new BBox3(position, position);
    }

    private writeStyle(style: ScreenSpaceLineStyleInput): void {
        const strideBytes = ScreenSpaceLineVertexAttributeLayout.strideBytes;

        if (!strideBytes) {
            throw new Error('Screen-space line layout requires a byte stride.');
        }

        const offset = this.vertexCount * strideBytes + 9 * Float32Array.BYTES_PER_ELEMENT;

        this.styleData[offset] = clampByte(style.stipple[0]);
        this.styleData[offset + 1] = clampByte(style.stipple[1]);
        this.styleData[offset + 2] = clampByte(style.stipple[2]);
        this.styleData[offset + 3] = clampByte(style.stipple[3]);
    }

    public toGeometryBuffer(): GeometryBuffer {
        return new GeometryBuffer({
            bounds: this.bounds,
            interleaved: new Float32Array(
                this.bytes.buffer.slice(
                    this.bytes.byteOffset,
                    this.bytes.byteOffset +
                        this.vertexCount *
                            (ScreenSpaceLineVertexAttributeLayout.strideBytes ??
                                ScreenSpaceLineVertexAttributeLayout.strideFloats *
                                    Float32Array.BYTES_PER_ELEMENT),
                ),
            ),
            layout: ScreenSpaceLineVertexAttributeLayout,
            vertexCount: this.vertexCount,
        });
    }
}

function clampByte(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
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

class PointBillboardBufferWriter {
    private bounds: BBox3 | null = null;
    private offset = 0;
    private vertexCount = 0;
    private readonly data: Float32Array;

    constructor(vertexCapacity: number) {
        this.data = new Float32Array(
            vertexCapacity * PointBillboardVertexAttributeLayout.strideFloats,
        );
    }

    public writePoint(position: Vector3): void {
        this.write(position, 1);
        this.write(position, 2);
        this.write(position, 3);
        this.write(position, 1);
        this.write(position, 3);
        this.write(position, 4);
    }

    private write(position: Vector3, cornerIndex: number): void {
        this.data[this.offset] = position.x;
        this.data[this.offset + 1] = position.y;
        this.data[this.offset + 2] = position.z;
        this.data[this.offset + 3] = cornerIndex;
        this.offset += PointBillboardVertexAttributeLayout.strideFloats;
        this.vertexCount += 1;
        this.bounds = this.bounds
            ? this.bounds.expandByPoint(position)
            : new BBox3(position, position);
    }

    public toGeometryBuffer(): GeometryBuffer {
        return new GeometryBuffer({
            bounds: this.bounds,
            interleaved: this.data,
            layout: PointBillboardVertexAttributeLayout,
            vertexCount: this.vertexCount,
        });
    }
}
