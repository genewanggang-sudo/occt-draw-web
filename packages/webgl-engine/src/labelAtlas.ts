import type { LabelFontWeight, LabelText } from './types';

export interface LabelGlyph {
    readonly ascentPixels: number;
    readonly descentPixels: number;
    readonly fontWeight: LabelFontWeight;
    readonly heightPixels: number;
    readonly maxU: number;
    readonly maxV: number;
    readonly minU: number;
    readonly minV: number;
    readonly text: LabelText;
    readonly widthPixels: number;
}

export type LabelGlyphKey = `${LabelText}:${LabelFontWeight}`;
type LabelFontWeightText = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';

export interface LabelAtlas {
    readonly fontWeightSignature: string;
    readonly glyphs: ReadonlyMap<LabelGlyphKey, LabelGlyph>;
    readonly textSignature: string;
    readonly texture: WebGLTexture;
}

export const DEFAULT_LABEL_FONT_WEIGHT: LabelFontWeight = 400;

const DEFAULT_LABEL_TEXTS = [
    'Top',
    'Front',
    'Right',
    'Top 平面',
    'Front 平面',
    'Right 平面',
    '上',
    '下',
    '前',
    '后',
    '右',
    '左',
    'X',
    'Y',
    'Z',
] as const;
const GLYPH_SIZE_PIXELS = 24;
const TEXTURE_SCALE = 4;
const CELL_PADDING_PIXELS = 8;
const CELL_HEIGHT = (GLYPH_SIZE_PIXELS + CELL_PADDING_PIXELS * 2) * TEXTURE_SCALE;

export function createLabelGlyphKey(text: LabelText, fontWeight: LabelFontWeight): LabelGlyphKey {
    return `${text}:${formatLabelFontWeight(fontWeight)}`;
}

export function createLabelAtlas(
    context: WebGL2RenderingContext,
    fontWeights: readonly LabelFontWeight[] = [DEFAULT_LABEL_FONT_WEIGHT],
    texts: readonly LabelText[] = DEFAULT_LABEL_TEXTS,
): LabelAtlas {
    const normalizedFontWeights = normalizeLabelFontWeights(fontWeights);
    const normalizedTexts = normalizeLabelTexts(texts);
    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) {
        throw new Error('WebGL label atlas initialization failed: cannot create Canvas2D context.');
    }

    const maxTextureSize = resolveMaxTextureSize(context);
    const cellWidth = resolveCellWidth(canvasContext, normalizedFontWeights, normalizedTexts);
    const columnCount = Math.max(1, Math.floor(maxTextureSize / cellWidth));
    const rowCountPerWeight = Math.max(1, Math.ceil(normalizedTexts.length / columnCount));
    const textureWidth = Math.max(
        1,
        Math.min(cellWidth * normalizedTexts.length, cellWidth * columnCount),
    );
    const textureHeight = Math.max(
        1,
        CELL_HEIGHT * rowCountPerWeight * normalizedFontWeights.length,
    );

    canvas.width = textureWidth;
    canvas.height = textureHeight;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.fillStyle = '#ffffff';
    canvasContext.textAlign = 'left';
    canvasContext.textBaseline = 'alphabetic';

    const glyphs = new Map<LabelGlyphKey, LabelGlyph>();

    normalizedFontWeights.forEach((fontWeight, weightIndex) => {
        canvasContext.font = createCanvasFont(fontWeight);

        normalizedTexts.forEach((text, textIndex) => {
            const columnIndex = textIndex % columnCount;
            const rowIndex = weightIndex * rowCountPerWeight + Math.floor(textIndex / columnCount);
            const cellX = columnIndex * cellWidth;
            const cellY = rowIndex * CELL_HEIGHT;
            const metrics = canvasContext.measureText(text);
            const padding = CELL_PADDING_PIXELS * TEXTURE_SCALE;
            const leftBearing = metrics.actualBoundingBoxLeft || 0;
            const rightBearing = Math.max(metrics.actualBoundingBoxRight || 0, metrics.width);
            const ascent = metrics.actualBoundingBoxAscent || GLYPH_SIZE_PIXELS * TEXTURE_SCALE;
            const descent =
                metrics.actualBoundingBoxDescent || GLYPH_SIZE_PIXELS * TEXTURE_SCALE * 0.25;
            const glyphWidth = Math.max(1, Math.ceil(leftBearing + rightBearing));
            const glyphHeight = Math.max(1, Math.ceil(ascent + descent));
            const drawX = cellX + padding + leftBearing;
            const drawBaselineY = cellY + padding + ascent;
            const minX = cellX + padding;
            const maxX = minX + glyphWidth;
            const minY = cellY + padding;
            const maxY = minY + glyphHeight;

            canvasContext.fillText(text, drawX, drawBaselineY);

            glyphs.set(createLabelGlyphKey(text, fontWeight), {
                text,
                fontWeight,
                ascentPixels: ascent / TEXTURE_SCALE,
                descentPixels: descent / TEXTURE_SCALE,
                widthPixels: glyphWidth / TEXTURE_SCALE,
                heightPixels: glyphHeight / TEXTURE_SCALE,
                minU: minX / textureWidth,
                maxU: maxX / textureWidth,
                minV: minY / textureHeight,
                maxV: maxY / textureHeight,
            });
        });
    });

    const texture = context.createTexture();

    context.bindTexture(context.TEXTURE_2D, texture);
    context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.RGBA,
        context.RGBA,
        context.UNSIGNED_BYTE,
        canvas,
    );
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);

    return {
        fontWeightSignature: createLabelAtlasFontWeightSignature(normalizedFontWeights),
        textSignature: createLabelAtlasTextSignature(normalizedTexts),
        texture,
        glyphs,
    };
}

export function createLabelAtlasFontWeightSignature(
    fontWeights: readonly LabelFontWeight[],
): string {
    return normalizeLabelFontWeights(fontWeights).map(formatLabelFontWeight).join(',');
}

export function createLabelAtlasTextSignature(texts: readonly LabelText[]): string {
    return normalizeLabelTexts(texts).join('\u0001');
}

export function normalizeLabelFontWeights(
    fontWeights: readonly LabelFontWeight[],
): readonly LabelFontWeight[] {
    const seen = new Set<LabelFontWeight>();
    const normalized: LabelFontWeight[] = [];

    for (const fontWeight of fontWeights) {
        if (!seen.has(fontWeight)) {
            seen.add(fontWeight);
            normalized.push(fontWeight);
        }
    }

    if (normalized.length === 0) {
        normalized.push(DEFAULT_LABEL_FONT_WEIGHT);
    }

    return normalized.sort((left, right) => left - right);
}

export function normalizeLabelTexts(texts: readonly LabelText[]): readonly LabelText[] {
    const seen = new Set<LabelText>();
    const normalized: LabelText[] = [];

    for (const text of [...DEFAULT_LABEL_TEXTS, ...texts]) {
        if (seen.has(text)) {
            continue;
        }

        seen.add(text);
        normalized.push(text);
    }

    return normalized;
}

function resolveCellWidth(
    context: CanvasRenderingContext2D,
    fontWeights: readonly LabelFontWeight[],
    texts: readonly LabelText[],
): number {
    const padding = CELL_PADDING_PIXELS * TEXTURE_SCALE;
    let maxWidth = 1;

    for (const fontWeight of fontWeights) {
        context.font = createCanvasFont(fontWeight);

        for (const text of texts) {
            const metrics = context.measureText(text);
            const leftBearing = metrics.actualBoundingBoxLeft || 0;
            const rightBearing = Math.max(metrics.actualBoundingBoxRight || 0, metrics.width);

            maxWidth = Math.max(maxWidth, Math.ceil(leftBearing + rightBearing));
        }
    }

    return Math.max(1, maxWidth + padding * 2);
}

function resolveMaxTextureSize(context: WebGL2RenderingContext): number {
    const maxTextureSize = Number(context.getParameter(context.MAX_TEXTURE_SIZE));

    if (!Number.isFinite(maxTextureSize) || maxTextureSize <= 0) {
        return 4096;
    }

    return maxTextureSize;
}

function createCanvasFont(fontWeight: LabelFontWeight): string {
    return `${String(fontWeight)} ${String(
        GLYPH_SIZE_PIXELS * TEXTURE_SCALE,
    )}px "Microsoft YaHei UI", "PingFang SC", Arial, sans-serif`;
}

function formatLabelFontWeight(fontWeight: LabelFontWeight): LabelFontWeightText {
    if (fontWeight === 100) {
        return '100';
    }

    if (fontWeight === 200) {
        return '200';
    }

    if (fontWeight === 300) {
        return '300';
    }

    if (fontWeight === 400) {
        return '400';
    }

    if (fontWeight === 500) {
        return '500';
    }

    if (fontWeight === 600) {
        return '600';
    }

    if (fontWeight === 700) {
        return '700';
    }

    if (fontWeight === 800) {
        return '800';
    }

    return '900';
}
