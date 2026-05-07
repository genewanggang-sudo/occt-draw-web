import type { GeometryBuffer, GeometryBufferBuilder } from './geometry';
import { type GeometryBounds, RenderObject, type RenderObjectOptions } from './core';
import type { DrawMode, DrawPrimitiveKind } from './pipeline/renderQueue';
import type { RenderMaterial, RenderMaterialResolver } from './pipeline/renderMaterial';
import type { EdgeStyle, FaceStyle, PointStyle } from './style';
import type { LineSegment3, Vector3 } from '@occt-draw/math';
import type { SurfaceTriangle } from './types';

export interface RenderablePrimitive {
    readonly cacheKey: string;
    readonly drawMode: DrawMode;
    readonly geometryBuffer: GeometryBuffer;
    readonly material: RenderMaterial;
    readonly primitiveKind: DrawPrimitiveKind;
}

export interface RenderableObjectBuildContext {
    readonly geometry: GeometryBufferBuilder;
    readonly materials: RenderMaterialResolver;
}

interface RenderablePrimitiveDraft {
    readonly drawMode: DrawMode;
    readonly geometryBuffer: GeometryBuffer;
    readonly material: RenderMaterial;
    readonly primitiveKind: DrawPrimitiveKind;
}

export class RenderObjectBuilder {
    private primitive: RenderablePrimitiveDraft | null = null;

    constructor(private readonly context: RenderableObjectBuildContext) {}

    public edges(segments: readonly LineSegment3[], style: EdgeStyle): void {
        this.setPrimitive({
            drawMode: 'lines',
            geometryBuffer: this.context.geometry.segments(segments),
            material: this.context.materials.edge(style),
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
        this.setPrimitive({
            drawMode: 'lines',
            geometryBuffer: this.context.geometry.segments(segments),
            material: this.context.materials.edge(style),
            primitiveKind: input.primitiveKind ?? 'edge',
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

    public build(): RenderablePrimitiveDraft {
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
        const builder = new RenderObjectBuilder(context);
        const primitive = this.resolveRenderablePrimitive(builder);

        return {
            cacheKey: this.createRenderCacheKey(),
            drawMode: primitive.drawMode,
            geometryBuffer: primitive.geometryBuffer,
            material: primitive.material,
            primitiveKind: primitive.primitiveKind,
        };
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

    private resolveRenderablePrimitive(builder: RenderObjectBuilder): RenderablePrimitiveDraft {
        if (
            this.cachedGeometryBuffer &&
            this.cachedGeometry === this.currentGeometry &&
            !this.dirtyFlags.geometry
        ) {
            this.build(builder);
            const primitive = builder.build();

            return {
                ...primitive,
                geometryBuffer: this.cachedGeometryBuffer,
            };
        }

        this.build(builder);
        const primitive = builder.build();

        this.cachedGeometry = this.currentGeometry;
        this.cachedGeometryBuffer = primitive.geometryBuffer;

        return primitive;
    }
}
