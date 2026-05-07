import { createLabelGlyphKey, DEFAULT_LABEL_FONT_WEIGHT, type LabelAtlas } from '../labelAtlas';
import { getCameraViewHeight } from '../cameraGeometry';
import type { RenderGraphObjectEntry } from '../graphTraversal';
import { collectSceneGraphObjects } from '../graphTraversal';
import { EdgeSet, FaceSet, MarkerSet, PointSet, TextLabelSet } from '../scene';
import type { CameraState, LabelVertex, MarkerVertex, RenderVertex, ViewportSize } from '../types';
import type { RenderFrameContext } from './renderPass';
import { Vec3, type Vector3 } from '@occt-draw/math';

export type ColorRenderCommand =
    | {
          readonly kind: 'edge';
          readonly object: EdgeSet;
          readonly vertices: readonly RenderVertex[];
      }
    | {
          readonly kind: 'face';
          readonly object: FaceSet;
          readonly vertices: readonly RenderVertex[];
      }
    | {
          readonly kind: 'label';
          readonly object: TextLabelSet;
          readonly vertices: readonly LabelVertex[];
      }
    | {
          readonly kind: 'marker';
          readonly object: MarkerSet;
          readonly vertices: readonly MarkerVertex[];
      }
    | {
          readonly kind: 'point';
          readonly object: PointSet;
          readonly vertices: readonly RenderVertex[];
      };

export interface ColorRenderQueue {
    readonly edges: readonly Extract<ColorRenderCommand, { readonly kind: 'edge' }>[];
    readonly faces: readonly Extract<ColorRenderCommand, { readonly kind: 'face' }>[];
    readonly labels: readonly Extract<ColorRenderCommand, { readonly kind: 'label' }>[];
    readonly markers: readonly Extract<ColorRenderCommand, { readonly kind: 'marker' }>[];
    readonly points: readonly Extract<ColorRenderCommand, { readonly kind: 'point' }>[];
}

export function buildColorRenderQueue(
    input: RenderFrameContext,
    atlas: Pick<LabelAtlas, 'glyphs'>,
): ColorRenderQueue {
    const edges: Extract<ColorRenderCommand, { readonly kind: 'edge' }>[] = [];
    const faces: Extract<ColorRenderCommand, { readonly kind: 'face' }>[] = [];
    const labels: Extract<ColorRenderCommand, { readonly kind: 'label' }>[] = [];
    const markers: Extract<ColorRenderCommand, { readonly kind: 'marker' }>[] = [];
    const points: Extract<ColorRenderCommand, { readonly kind: 'point' }>[] = [];
    const worldUnitsPerPixel = calculateWorldUnitsPerPixel(input.camera, input.viewportSize);

    for (const entry of collectSceneGraphObjects(input.graph)) {
        appendQueueEntry({
            atlas,
            edges,
            entry,
            faces,
            labels,
            markers,
            points,
            worldUnitsPerPixel,
        });
    }

    return { edges, faces, labels, markers, points };
}

function appendQueueEntry(input: {
    readonly atlas: Pick<LabelAtlas, 'glyphs'>;
    readonly edges: Extract<ColorRenderCommand, { readonly kind: 'edge' }>[];
    readonly entry: RenderGraphObjectEntry;
    readonly faces: Extract<ColorRenderCommand, { readonly kind: 'face' }>[];
    readonly labels: Extract<ColorRenderCommand, { readonly kind: 'label' }>[];
    readonly markers: Extract<ColorRenderCommand, { readonly kind: 'marker' }>[];
    readonly points: Extract<ColorRenderCommand, { readonly kind: 'point' }>[];
    readonly worldUnitsPerPixel: number;
}): void {
    const { object } = input.entry;

    if (object instanceof FaceSet) {
        input.faces.push({
            kind: 'face',
            object,
            vertices: createFaceVertices(object),
        });
    } else if (object instanceof EdgeSet) {
        input.edges.push({
            kind: 'edge',
            object,
            vertices: createEdgeVertices(object),
        });
    } else if (object instanceof PointSet) {
        input.points.push({
            kind: 'point',
            object,
            vertices: createPointVertices(object),
        });
    } else if (object instanceof MarkerSet) {
        input.markers.push({
            kind: 'marker',
            object,
            vertices: createMarkerVertices(object),
        });
    } else if (object instanceof TextLabelSet) {
        input.labels.push({
            kind: 'label',
            object,
            vertices: createLabelVertices(object, input.atlas, input.worldUnitsPerPixel),
        });
    }
}

function createFaceVertices(object: FaceSet): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const triangle of object.geometry.triangles) {
        vertices.push(
            { position: triangle.a, color: object.style.color, alpha: object.style.opacity },
            { position: triangle.b, color: object.style.color, alpha: object.style.opacity },
            { position: triangle.c, color: object.style.color, alpha: object.style.opacity },
        );
    }

    return vertices;
}

function createEdgeVertices(object: EdgeSet): readonly RenderVertex[] {
    const vertices: RenderVertex[] = [];

    for (const segment of object.geometry.segments) {
        vertices.push(
            { position: segment.start, color: object.style.color, alpha: 1 },
            { position: segment.end, color: object.style.color, alpha: 1 },
        );
    }

    return vertices;
}

function createPointVertices(object: PointSet): readonly RenderVertex[] {
    return object.geometry.points.map((point) => ({
        position: point,
        color: object.style.color,
        alpha: 1,
    }));
}

function createMarkerVertices(object: MarkerSet): readonly MarkerVertex[] {
    return object.geometry.markers.map((marker) => ({
        position: marker.position,
        color: marker.color,
        alpha: 1,
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
            topLeft,
            topRight: Vec3.add(topLeft, Vec3.scale(xAxis, width)),
            bottomLeft: Vec3.add(topLeft, Vec3.scale(yAxis, height)),
            bottomRight: Vec3.add(
                Vec3.add(topLeft, Vec3.scale(xAxis, width)),
                Vec3.scale(yAxis, height),
            ),
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
        position,
        uv: { x: u, y: v },
        color,
        alpha: 1,
    };
}

function calculateWorldUnitsPerPixel(camera: CameraState, viewportSize: ViewportSize): number {
    return getCameraViewHeight(camera) / Math.max(viewportSize.height, 1);
}
