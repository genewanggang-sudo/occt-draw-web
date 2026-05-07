import { Vec3, type Vector3 } from '@occt-draw/math';
import { getCameraViewHeight } from '../cameraGeometry';
import { GeometryBufferBuilder, type GeometryBuffer } from '../geometry';
import type { RenderGraphObjectEntry } from '../graphTraversal';
import { collectSceneGraphObjects } from '../graphTraversal';
import { createLabelGlyphKey, DEFAULT_LABEL_FONT_WEIGHT, type LabelAtlas } from '../labelAtlas';
import { MarkerSet, TextLabelSet } from '../scene';
import { RenderableObject } from '../renderableObject';
import type { CameraState, LabelVertex, MarkerVertex, ViewportSize } from '../types';
import type { RenderFrameContext } from './renderPass';
import {
    resolveMarkerMaterial,
    resolveTextMaterial,
    type RenderMaterial,
    RenderMaterialResolver,
} from './renderMaterial';

export type DrawPrimitiveKind = 'edge' | 'face' | 'label' | 'marker' | 'point' | (string & {});
export type DrawMode = 'lines' | 'points' | 'triangles';

interface BaseDrawCommand<TObject, TVertex> {
    readonly cacheKey: string;
    readonly depthPolicy: 'scene';
    readonly dirtyFlags: {
        readonly geometry: boolean;
        readonly object: boolean;
        readonly style: boolean;
    };
    readonly drawMode: DrawMode;
    readonly material: RenderMaterial;
    readonly object: TObject;
    readonly primitiveKind: DrawPrimitiveKind;
    readonly style: TObject extends { readonly style: infer TStyle } ? TStyle : never;
    readonly vertices: readonly TVertex[];
}

interface BufferDrawCommand<TObject> {
    readonly geometryBuffer: GeometryBuffer;
    readonly cacheKey: string;
    readonly depthPolicy: 'scene';
    readonly dirtyFlags: {
        readonly geometry: boolean;
        readonly object: boolean;
        readonly style: boolean;
    };
    readonly drawMode: DrawMode;
    readonly material: RenderMaterial;
    readonly object: TObject;
    readonly primitiveKind: DrawPrimitiveKind;
    readonly style: TObject extends { readonly style: infer TStyle } ? TStyle : never;
}

export type DrawCommand =
    | (BufferDrawCommand<RenderableObject<unknown, unknown>> & { readonly primitiveKind: string })
    | (BaseDrawCommand<MarkerSet, MarkerVertex> & { readonly primitiveKind: 'marker' })
    | (BaseDrawCommand<TextLabelSet, LabelVertex> & { readonly primitiveKind: 'label' });

export class RenderQueue {
    public readonly edges: BufferDrawCommand<RenderableObject<unknown, unknown>>[] = [];
    public readonly faces: BufferDrawCommand<RenderableObject<unknown, unknown>>[] = [];
    public readonly labels: Extract<DrawCommand, { readonly primitiveKind: 'label' }>[] = [];
    public readonly markers: Extract<DrawCommand, { readonly primitiveKind: 'marker' }>[] = [];
    public readonly points: BufferDrawCommand<RenderableObject<unknown, unknown>>[] = [];
}

export class RenderQueueBuilder {
    private readonly geometryBuffers = new GeometryBufferBuilder();
    private readonly materials = new RenderMaterialResolver();

    public build(input: RenderFrameContext, atlas: Pick<LabelAtlas, 'glyphs'>): RenderQueue {
        const queue = new RenderQueue();
        const worldUnitsPerPixel = calculateWorldUnitsPerPixel(input.camera, input.viewportSize);

        for (const entry of collectSceneGraphObjects(input.graph)) {
            this.appendQueueEntry(queue, entry, atlas, worldUnitsPerPixel);
        }

        return queue;
    }

    private appendQueueEntry(
        queue: RenderQueue,
        entry: RenderGraphObjectEntry,
        atlas: Pick<LabelAtlas, 'glyphs'>,
        worldUnitsPerPixel: number,
    ): void {
        const { object } = entry;

        if (object instanceof RenderableObject) {
            this.appendRenderableObject(queue, object);
        } else if (object instanceof MarkerSet) {
            queue.markers.push({
                cacheKey: `color:marker:${object.id}`,
                depthPolicy: 'scene',
                dirtyFlags: object.dirtyFlags,
                drawMode: 'points',
                material: resolveMarkerMaterial(object.style),
                object,
                primitiveKind: 'marker',
                style: object.style,
                vertices: createMarkerVertices(object),
            });
        } else if (object instanceof TextLabelSet) {
            queue.labels.push({
                cacheKey: `color:label:${object.id}`,
                depthPolicy: 'scene',
                dirtyFlags: object.dirtyFlags,
                drawMode: 'triangles',
                material: resolveTextMaterial(object.style),
                object,
                primitiveKind: 'label',
                style: object.style,
                vertices: createLabelVertices(object, atlas, worldUnitsPerPixel),
            });
        }
    }

    private appendRenderableObject(
        queue: RenderQueue,
        object: RenderableObject<unknown, unknown>,
    ): void {
        const primitive = object.createRenderablePrimitive({
            geometry: this.geometryBuffers,
            materials: this.materials,
        });
        const command: BufferDrawCommand<RenderableObject<unknown, unknown>> = {
            cacheKey: primitive.cacheKey,
            depthPolicy: 'scene',
            dirtyFlags: object.dirtyFlags,
            drawMode: primitive.drawMode,
            geometryBuffer: primitive.geometryBuffer,
            material: primitive.material,
            object,
            primitiveKind: primitive.primitiveKind,
            style: object.style,
        };

        if (primitive.drawMode === 'triangles') {
            queue.faces.push(command);
        } else if (primitive.drawMode === 'lines') {
            queue.edges.push(command);
        } else {
            queue.points.push(command);
        }
    }
}

function createMarkerVertices(object: MarkerSet): readonly MarkerVertex[] {
    return object.geometry.markers.map((marker) => ({
        alpha: 1,
        color: marker.color,
        position: marker.position,
        sizePixels: marker.sizePixels,
    }));
}

interface LabelQuad {
    readonly bottomLeft: Vector3;
    readonly bottomRight: Vector3;
    readonly topLeft: Vector3;
    readonly topRight: Vector3;
}

function createLabelVertices(
    object: TextLabelSet,
    atlas: Pick<LabelAtlas, 'glyphs'>,
    worldUnitsPerPixel: number,
): readonly LabelVertex[] {
    const vertices: LabelVertex[] = [];

    for (const label of object.geometry.labels) {
        const glyph = atlas.glyphs.get(
            createLabelGlyphKey(label.text, label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT),
        );

        if (!glyph) {
            throw new Error(`WebGL label glyph not found: ${label.text}`);
        }

        const xAxis = Vec3.normalize(label.frame.xAxis);
        const yAxis = Vec3.normalize(label.frame.yAxis);
        const insertWorld = Vec3.add(
            Vec3.add(label.frame.origin, Vec3.scale(xAxis, label.insert.x)),
            Vec3.scale(yAxis, label.insert.y),
        );
        const aspectRatio = glyph.widthPixels / Math.max(glyph.heightPixels, 1);
        const height = label.heightPixels * worldUnitsPerPixel;
        const width = label.heightPixels * aspectRatio * worldUnitsPerPixel;
        const baselineFromTop = height * (glyph.ascentPixels / Math.max(glyph.heightPixels, 1));
        const horizontalOffset =
            label.justify.horizontal === 'center'
                ? width / 2
                : label.justify.horizontal === 'right'
                  ? width
                  : 0;
        const verticalOffset =
            label.justify.vertical === 'middle'
                ? height / 2
                : label.justify.vertical === 'bottom'
                  ? height
                  : label.justify.vertical === 'baseline'
                    ? label.justify.baseline === 'middle'
                        ? height / 2
                        : baselineFromTop
                    : 0;
        const padding = label.paddingPixels ?? { x: 0, y: 0 };
        const topLeft = Vec3.add(
            Vec3.add(
                insertWorld,
                Vec3.scale(xAxis, -horizontalOffset + padding.x * worldUnitsPerPixel),
            ),
            Vec3.scale(yAxis, -verticalOffset + padding.y * worldUnitsPerPixel),
        );
        const quad: LabelQuad = {
            bottomLeft: Vec3.add(topLeft, Vec3.scale(yAxis, height)),
            bottomRight: Vec3.add(
                Vec3.add(topLeft, Vec3.scale(xAxis, width)),
                Vec3.scale(yAxis, height),
            ),
            topLeft,
            topRight: Vec3.add(topLeft, Vec3.scale(xAxis, width)),
        };

        vertices.push(
            createLabelVertex(quad.topLeft, glyph.minU, glyph.minV, label.color),
            createLabelVertex(quad.bottomLeft, glyph.minU, glyph.maxV, label.color),
            createLabelVertex(quad.bottomRight, glyph.maxU, glyph.maxV, label.color),
            createLabelVertex(quad.topLeft, glyph.minU, glyph.minV, label.color),
            createLabelVertex(quad.bottomRight, glyph.maxU, glyph.maxV, label.color),
            createLabelVertex(quad.topRight, glyph.maxU, glyph.minV, label.color),
        );
    }

    return vertices;
}

function createLabelVertex(position: Vector3, u: number, v: number, color: Vector3): LabelVertex {
    return {
        alpha: 1,
        color,
        position,
        uv: { x: u, y: v },
    };
}

function calculateWorldUnitsPerPixel(camera: CameraState, viewportSize: ViewportSize): number {
    return getCameraViewHeight(camera) / Math.max(viewportSize.height, 1);
}
