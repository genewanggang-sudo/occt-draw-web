import type { DisplayModel, LabelBatchDisplayObject, LabelDisplayItem } from '@occt-draw/display';
import {
    addVector3,
    normalizeVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { CameraState, ViewportSize } from '@occt-draw/renderer';
import {
    createLabelGlyphKey,
    DEFAULT_LABEL_FONT_WEIGHT,
    type LabelAtlas,
    type LabelGlyph,
} from './labelAtlas';
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
    displayModel,
    viewportSize,
}: {
    readonly atlas: Pick<LabelAtlas, 'glyphs'>;
    readonly camera: CameraState;
    readonly displayModel: DisplayModel;
    readonly viewportSize: ViewportSize;
}): readonly LabelVertex[] {
    const vertices: LabelVertex[] = [];
    const worldUnitsPerPixel = calculateWorldUnitsPerPixel(camera, viewportSize);

    for (const object of displayModel.objects) {
        if (!object.visible || object.kind !== 'label-batch') {
            continue;
        }

        appendLabelBatch(vertices, object, atlas, worldUnitsPerPixel);
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

function appendLabelBatch(
    vertices: LabelVertex[],
    object: LabelBatchDisplayObject,
    atlas: Pick<LabelAtlas, 'glyphs'>,
    worldUnitsPerPixel: number,
): void {
    for (const label of object.labels) {
        const glyph = resolveGlyph(label, atlas);
        const frameBasis = resolveFrameBasis(label);
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

function resolveGlyph(label: LabelDisplayItem, atlas: Pick<LabelAtlas, 'glyphs'>): LabelGlyph {
    const glyph = atlas.glyphs.get(
        createLabelGlyphKey(label.text, label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT),
    );

    if (!glyph) {
        throw new Error(`WebGL label glyph not found: ${label.text}`);
    }

    return glyph;
}

function resolveFrameBasis(label: LabelDisplayItem): TextFrameBasis {
    return {
        xAxis: normalizeVector3(label.frame.xAxis),
        yAxis: normalizeVector3(label.frame.yAxis),
    };
}

function resolveInsertWorld(label: LabelDisplayItem, frameBasis: TextFrameBasis): Vector3 {
    return addVector3(
        addVector3(label.frame.origin, scaleVector3(frameBasis.xAxis, label.insert.x)),
        scaleVector3(frameBasis.yAxis, label.insert.y),
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

    return addVector3(
        addVector3(insertWorld, scaleVector3(frameBasis.xAxis, -horizontalOffset)),
        scaleVector3(frameBasis.yAxis, -verticalOffset),
    );
}

function applyPaddingPixels(
    topLeft: Vector3,
    label: LabelDisplayItem,
    frameBasis: TextFrameBasis,
    worldUnitsPerPixel: number,
): Vector3 {
    const padding = label.paddingPixels ?? { x: 0, y: 0 };

    return addVector3(
        addVector3(topLeft, scaleVector3(frameBasis.xAxis, padding.x * worldUnitsPerPixel)),
        scaleVector3(frameBasis.yAxis, padding.y * worldUnitsPerPixel),
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
    const topRight = addVector3(topLeft, scaleVector3(frameBasis.xAxis, metrics.width));
    const bottomLeft = addVector3(topLeft, scaleVector3(frameBasis.yAxis, metrics.height));
    const bottomRight = addVector3(topRight, scaleVector3(frameBasis.yAxis, metrics.height));

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
    if (camera.projection === 'orthographic') {
        return camera.orthographicHeight / Math.max(viewportSize.height, 1);
    }

    const distanceToTarget = lengthVector3(subtractVector3(camera.position, camera.target));

    return (
        (2 * distanceToTarget * Math.tan(camera.fovYRadians / 2)) / Math.max(viewportSize.height, 1)
    );
}

function lengthVector3(vector: Vector3): number {
    return Math.hypot(vector.x, vector.y, vector.z);
}
