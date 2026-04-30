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
    readonly texture: WebGLTexture;
}

export const DEFAULT_LABEL_FONT_WEIGHT: LabelFontWeight = 400;

const LABEL_TEXTS = ['Top', 'Front', 'Right'] as const;
const GLYPH_SIZE_PIXELS = 24;
const TEXTURE_SCALE = 4;
const CELL_PADDING_PIXELS = 8;
const CELL_WIDTH = 96 * TEXTURE_SCALE;
const CELL_HEIGHT = (GLYPH_SIZE_PIXELS + CELL_PADDING_PIXELS * 2) * TEXTURE_SCALE;
const TEXTURE_WIDTH = CELL_WIDTH * LABEL_TEXTS.length;

export function createLabelGlyphKey(text: LabelText, fontWeight: LabelFontWeight): LabelGlyphKey {
    return `${text}:${formatLabelFontWeight(fontWeight)}`;
}

export function createLabelAtlas(
    context: WebGL2RenderingContext,
    fontWeights: readonly LabelFontWeight[] = [DEFAULT_LABEL_FONT_WEIGHT],
): LabelAtlas {
    const normalizedFontWeights = normalizeLabelFontWeights(fontWeights);
    const textureHeight = CELL_HEIGHT * normalizedFontWeights.length;
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = textureHeight;
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) {
        throw new Error('WebGL label atlas initialization failed: cannot create Canvas2D context.');
    }

    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.fillStyle = '#ffffff';
    canvasContext.textAlign = 'left';
    canvasContext.textBaseline = 'alphabetic';

    const glyphs = new Map<LabelGlyphKey, LabelGlyph>();

    normalizedFontWeights.forEach((fontWeight, rowIndex) => {
        canvasContext.font = `${String(fontWeight)} ${String(
            GLYPH_SIZE_PIXELS * TEXTURE_SCALE,
        )}px Arial, sans-serif`;

        LABEL_TEXTS.forEach((text, columnIndex) => {
            const cellX = columnIndex * CELL_WIDTH;
            const cellY = rowIndex * CELL_HEIGHT;
            const metrics = canvasContext.measureText(text);
            const padding = CELL_PADDING_PIXELS * TEXTURE_SCALE;
            const leftBearing = metrics.actualBoundingBoxLeft;
            const rightBearing = metrics.actualBoundingBoxRight;
            const ascent = metrics.actualBoundingBoxAscent;
            const descent = metrics.actualBoundingBoxDescent;
            const glyphWidth = Math.ceil(leftBearing + rightBearing);
            const glyphHeight = Math.ceil(ascent + descent);
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
                minU: minX / TEXTURE_WIDTH,
                maxU: maxX / TEXTURE_WIDTH,
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
        texture,
        glyphs,
    };
}

export function createLabelAtlasFontWeightSignature(
    fontWeights: readonly LabelFontWeight[],
): string {
    return normalizeLabelFontWeights(fontWeights).map(formatLabelFontWeight).join(',');
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
