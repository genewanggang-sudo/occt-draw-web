import type { RenderGraph } from './core';
import { collectSceneGraphObjects } from './graphTraversal';
import { TextLabelSet } from './scene';
import type { LabelDisplayItem } from './types';
import { Vec3, type Vector3 } from '@occt-draw/math';
import type { CameraState, ViewportSize } from './types';
import {
    createLabelGlyphKey,
    DEFAULT_LABEL_FONT_WEIGHT,
    type LabelAtlas,
    type LabelGlyph,
} from './labelAtlas';
import { getCameraViewHeight } from './cameraGeometry';
import type { LabelVertex } from './types';

interface LabelQuad {
    readonly bottomLeft: Vector3;
    readonly bottomRight: Vector3;
    readonly topLeft: Vector3;
    readonly topRight: Vector3;
}

interface TextBoxMetrics {
    readonly baselineFromTop: number;
    readonly height: number;
    readonly width: number;
}

interface TextFrameBasis {
    readonly xAxis: Vector3;
    readonly yAxis: Vector3;
}

export function createDisplayLabelVertices({
    atlas,
    camera,
    graph,
    viewportSize,
}: {
    readonly atlas: Pick<LabelAtlas, 'glyphs'>;
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly viewportSize: ViewportSize;
}): readonly LabelVertex[] {
    const vertices: LabelVertex[] = [];
    const worldUnitsPerPixel = calculateWorldUnitsPerPixel(camera, viewportSize);

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (object instanceof TextLabelSet) {
            appendLabelSet(vertices, object, atlas, camera, worldUnitsPerPixel);
        }
    }

    return vertices;
}

export function toLabelVertexBuffer(vertices: readonly LabelVertex[]): Float32Array {
    const values: number[] = [];

    for (const vertex of vertices) {
        values.push(
            vertex.position.x,
            vertex.position.y,
            vertex.position.z,
            vertex.uv.x,
            vertex.uv.y,
            vertex.color.x,
            vertex.color.y,
            vertex.color.z,
            vertex.alpha,
        );
    }

    return new Float32Array(values);
}

function appendLabelSet(
    vertices: LabelVertex[],
    object: TextLabelSet,
    atlas: Pick<LabelAtlas, 'glyphs'>,
    camera: CameraState,
    worldUnitsPerPixel: number,
): void {
    for (const label of object.geometry.labels) {
        const glyph = resolveGlyph(label, atlas);

        if (!glyph) {
            continue;
        }
        const frameBasis = resolveFrameBasis(label, camera);
        const insertWorld = resolveInsertWorld(label, frameBasis);
        const metrics = resolveTextBoxMetrics(glyph, label.heightPixels, worldUnitsPerPixel);
        const topLeft = applyPaddingPixels(
            resolveTextTopLeft(insertWorld, label, metrics, frameBasis),
            label,
            frameBasis,
            worldUnitsPerPixel,
        );
        const quad = buildLabelQuad(topLeft, metrics, frameBasis);

        vertices.push(
            createLabelVertex(quad.topLeft, glyph.minU, glyph.minV, label.color),
            createLabelVertex(quad.bottomLeft, glyph.minU, glyph.maxV, label.color),
            createLabelVertex(quad.bottomRight, glyph.maxU, glyph.maxV, label.color),
            createLabelVertex(quad.topLeft, glyph.minU, glyph.minV, label.color),
            createLabelVertex(quad.bottomRight, glyph.maxU, glyph.maxV, label.color),
            createLabelVertex(quad.topRight, glyph.maxU, glyph.minV, label.color),
        );
    }
}

function resolveGlyph(
    label: LabelDisplayItem,
    atlas: Pick<LabelAtlas, 'glyphs'>,
): LabelGlyph | null {
    const glyph = atlas.glyphs.get(
        createLabelGlyphKey(label.text, label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT),
    );

    return glyph ?? null;
}

function resolveFrameBasis(label: LabelDisplayItem, camera: CameraState): TextFrameBasis {
    if (label.orientation === 'screen') {
        const forward = Vec3.normalize(Vec3.subtract(camera.target, camera.position));
        const right = Vec3.normalize(Vec3.cross(forward, camera.up));

        return {
            xAxis: right,
            yAxis: Vec3.scale(Vec3.normalize(camera.up), -1),
        };
    }

    return {
        xAxis: Vec3.normalize(label.frame.xAxis),
        yAxis: Vec3.normalize(label.frame.yAxis),
    };
}

function resolveInsertWorld(label: LabelDisplayItem, frameBasis: TextFrameBasis): Vector3 {
    return Vec3.add(
        Vec3.add(label.frame.origin, Vec3.scale(frameBasis.xAxis, label.insert.x)),
        Vec3.scale(frameBasis.yAxis, label.insert.y),
    );
}

function resolveTextBoxMetrics(
    glyph: LabelGlyph,
    heightPixels: number,
    worldUnitsPerPixel: number,
): TextBoxMetrics {
    const aspectRatio = glyph.widthPixels / Math.max(glyph.heightPixels, 1);
    const height = heightPixels * worldUnitsPerPixel;
    const width = heightPixels * aspectRatio * worldUnitsPerPixel;
    const baselineRatio = glyph.ascentPixels / Math.max(glyph.heightPixels, 1);

    return {
        baselineFromTop: height * baselineRatio,
        height,
        width,
    };
}

function resolveTextTopLeft(
    insertWorld: Vector3,
    label: LabelDisplayItem,
    metrics: TextBoxMetrics,
    frameBasis: TextFrameBasis,
): Vector3 {
    const horizontalOffset = resolveHorizontalJustifyOffset(
        label.justify.horizontal,
        metrics.width,
    );
    const verticalOffset = resolveVerticalJustifyOffset(label, metrics);

    return Vec3.add(
        Vec3.add(insertWorld, Vec3.scale(frameBasis.xAxis, -horizontalOffset)),
        Vec3.scale(frameBasis.yAxis, -verticalOffset),
    );
}

function applyPaddingPixels(
    topLeft: Vector3,
    label: LabelDisplayItem,
    frameBasis: TextFrameBasis,
    worldUnitsPerPixel: number,
): Vector3 {
    const padding = label.paddingPixels ?? { x: 0, y: 0 };

    return Vec3.add(
        Vec3.add(topLeft, Vec3.scale(frameBasis.xAxis, padding.x * worldUnitsPerPixel)),
        Vec3.scale(frameBasis.yAxis, padding.y * worldUnitsPerPixel),
    );
}

function resolveHorizontalJustifyOffset(
    horizontal: LabelDisplayItem['justify']['horizontal'],
    width: number,
): number {
    if (horizontal === 'center') {
        return width / 2;
    }

    if (horizontal === 'right') {
        return width;
    }

    return 0;
}

function resolveVerticalJustifyOffset(label: LabelDisplayItem, metrics: TextBoxMetrics): number {
    if (label.justify.vertical === 'middle') {
        return metrics.height / 2;
    }

    if (label.justify.vertical === 'bottom') {
        return metrics.height;
    }

    if (label.justify.vertical === 'baseline') {
        return resolveBaselineOffset(label, metrics);
    }

    return 0;
}

function resolveBaselineOffset(label: LabelDisplayItem, metrics: TextBoxMetrics): number {
    if (label.justify.baseline === 'middle') {
        return metrics.height / 2;
    }

    return metrics.baselineFromTop;
}

function buildLabelQuad(
    topLeft: Vector3,
    metrics: TextBoxMetrics,
    frameBasis: TextFrameBasis,
): LabelQuad {
    const topRight = Vec3.add(topLeft, Vec3.scale(frameBasis.xAxis, metrics.width));
    const bottomLeft = Vec3.add(topLeft, Vec3.scale(frameBasis.yAxis, metrics.height));
    const bottomRight = Vec3.add(topRight, Vec3.scale(frameBasis.yAxis, metrics.height));

    return {
        bottomLeft,
        bottomRight,
        topLeft,
        topRight,
    };
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
