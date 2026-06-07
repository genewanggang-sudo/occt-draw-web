import type { GeometryBuffer, GeometryBufferBuilder } from './geometry';
import { type GeometryBounds, RenderObject, type RenderObjectOptions } from './core';
import type { DrawMode, DrawPrimitiveKind } from './pipeline/renderQueue';
import type { RenderMaterial, RenderMaterialResolver } from './pipeline/renderMaterial';
import type { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from './style';
import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type { LabelDisplayItem, MarkerDisplayItem, MarkerVertex, SurfaceTriangle } from './types';

export interface RenderablePrimitive {
    readonly cacheKey: string;
    readonly drawMode: DrawMode;
    readonly geometryBuffer?: GeometryBuffer;
    readonly labelItems?: readonly LabelDisplayItem[];
    readonly material: RenderMaterial;
    readonly markerVertices?: readonly MarkerVertex[];
    readonly primitiveKind: DrawPrimitiveKind;
}

export interface RenderableObjectBuildContext {
    readonly geometry: GeometryBufferBuilder;
    readonly materials: RenderMaterialResolver;
}

interface RenderablePrimitiveDraft {
    readonly drawMode: DrawMode;
    readonly geometryBuffer?: GeometryBuffer;
    readonly labelItems?: readonly LabelDisplayItem[];
    readonly material: RenderMaterial;
    readonly markerVertices?: readonly MarkerVertex[];
    readonly primitiveKind: DrawPrimitiveKind;
}

export interface RenderObjectBuilder {
    edges(segments: readonly LineSegment3[], style: EdgeStyle): void;
    faces(triangles: readonly SurfaceTriangle[], style: FaceStyle): void;
    labels(labels: readonly LabelDisplayItem[], style: TextStyle): void;
    lines(
        segments: readonly LineSegment3[],
        style: EdgeStyle,
        input?: { readonly primitiveKind?: DrawPrimitiveKind },
    ): void;
    markers(markers: readonly MarkerDisplayItem[], style: MarkerStyle): void;
    points(points: readonly Vector3[], style: PointStyle): void;
}

class RenderObjectPrimitiveBuilder implements RenderObjectBuilder {
    private primitive: RenderablePrimitiveDraft | null = null;

    constructor(private readonly context: RenderableObjectBuildContext) {}

    public edges(segments: readonly LineSegment3[], style: EdgeStyle): void {
        const material = this.context.materials.edge(style);

        this.setPrimitive({
            drawMode: 'triangles',
            geometryBuffer: this.context.geometry.screenSpaceLineSegments(segments, {
                stipple: material.lineStipple,
                widthPx: material.lineWidthPx,
            }),
            material,
            primitiveKind: 'edge',
        });
    }

    public faces(triangles: readonly SurfaceTriangle[], style: FaceStyle): void {
        this.setPrimitive({
            drawMode: 'triangles',
            geometryBuffer: this.context.geometry.triangles(triangles),
            material: this.context.materials.face(style),
            primitiveKind: 'face',
        });
    }

    public lines(
        segments: readonly LineSegment3[],
        style: EdgeStyle,
        input: { readonly primitiveKind?: DrawPrimitiveKind } = {},
    ): void {
        const material = this.context.materials.edge(style);

        this.setPrimitive({
            drawMode: 'triangles',
            geometryBuffer: this.context.geometry.screenSpaceLineSegments(segments, {
                stipple: material.lineStipple,
                widthPx: material.lineWidthPx,
            }),
            material,
            primitiveKind: input.primitiveKind ?? 'edge',
        });
    }

    public labels(labels: readonly LabelDisplayItem[], style: TextStyle): void {
        this.setPrimitive({
            drawMode: 'triangles',
            labelItems: labels,
            material: this.context.materials.text(style),
            primitiveKind: 'label',
        });
    }

    public markers(markers: readonly MarkerDisplayItem[], style: MarkerStyle): void {
        this.setPrimitive({
            drawMode: 'points',
            material: this.context.materials.marker(style),
            markerVertices: markers.map((marker) => ({
                alpha: 1,
                color: marker.color,
                position: marker.position,
                sizePixels: marker.sizePixels,
            })),
            primitiveKind: 'marker',
        });
    }

    public points(points: readonly Vector3[], style: PointStyle): void {
        this.setPrimitive({
            drawMode: 'points',
            geometryBuffer: this.context.geometry.points(points),
            material: this.context.materials.point(style),
            primitiveKind: 'point',
        });
    }

    public toPrimitive(): RenderablePrimitiveDraft {
        if (!this.primitive) {
            throw new Error('RenderableObject.build(builder) did not submit a primitive.');
        }

        return this.primitive;
    }

    private setPrimitive(primitive: RenderablePrimitiveDraft): void {
        this.primitive = primitive;
    }
}

export abstract class RenderableObject<TGeometry, TStyle> extends RenderObject {
    private cachedGeometry: TGeometry | null = null;
    private cachedGeometryBuffer: GeometryBuffer | null = null;
    private currentGeometry: TGeometry;
    private currentStyle: TStyle;

    protected constructor(
        kind: string,
        geometry: TGeometry,
        style: TStyle,
        options: RenderObjectOptions = {},
    ) {
        super(kind, options);
        this.currentGeometry = geometry;
        this.currentStyle = style;
    }

    public get geometry(): TGeometry {
        return this.currentGeometry;
    }

    public get style(): TStyle {
        return this.currentStyle;
    }

    public get bounds(): GeometryBounds {
        return this.computeBounds();
    }

    public createRenderablePrimitive(context: RenderableObjectBuildContext): RenderablePrimitive {
        const builder = new RenderObjectPrimitiveBuilder(context);
        const primitive = this.resolveRenderablePrimitive(builder);

        const result: RenderablePrimitive = {
            cacheKey: this.createRenderCacheKey(),
            drawMode: primitive.drawMode,
            material: primitive.material,
            primitiveKind: primitive.primitiveKind,
        };

        if (primitive.geometryBuffer) {
            return {
                ...result,
                geometryBuffer: primitive.geometryBuffer,
            };
        }

        if (primitive.labelItems) {
            return {
                ...result,
                labelItems: primitive.labelItems,
            };
        }

        if (primitive.markerVertices) {
            return {
                ...result,
                markerVertices: primitive.markerVertices,
            };
        }

        return result;
    }

    public setGeometry(geometry: TGeometry): void {
        if (this.currentGeometry === geometry) {
            return;
        }

        this.currentGeometry = geometry;
        this.markDirty({ bounds: true, geometry: true });
    }

    public setStyle(style: TStyle): void {
        if (this.currentStyle === style) {
            return;
        }

        this.currentStyle = style;
        this.markDirty({ style: true });
    }

    protected createRenderCacheKey(): string {
        return `color:${this.kind}:${this.id}`;
    }

    protected abstract build(builder: RenderObjectBuilder): void;
    protected abstract computeBounds(): GeometryBounds;

    private resolveRenderablePrimitive(
        builder: RenderObjectPrimitiveBuilder,
    ): RenderablePrimitiveDraft {
        if (
            this.cachedGeometryBuffer &&
            this.cachedGeometry === this.currentGeometry &&
            !this.dirtyFlags.geometry &&
            !this.dirtyFlags.style
        ) {
            this.build(builder);
            const primitive = builder.toPrimitive();

            return {
                ...primitive,
                geometryBuffer: this.cachedGeometryBuffer,
            };
        }

        this.build(builder);
        const primitive = builder.toPrimitive();

        this.cachedGeometry = this.currentGeometry;
        this.cachedGeometryBuffer = primitive.geometryBuffer ?? null;

        return primitive;
    }
}
