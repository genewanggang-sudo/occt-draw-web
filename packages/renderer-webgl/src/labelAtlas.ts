import type { LabelText } from '@occt-draw/display';

export interface LabelGlyph {
    readonly ascentPixels: number;
    readonly descentPixels: number;
    readonly heightPixels: number;
    readonly maxU: number;
    readonly maxV: number;
    readonly minU: number;
    readonly minV: number;
    readonly text: LabelText;
    readonly widthPixels: number;
}

export interface LabelAtlas {
    readonly glyphs: Readonly<Record<LabelText, LabelGlyph>>;
    readonly texture: WebGLTexture;
}

const LABEL_TEXTS = ['Top', 'Front', 'Right'] as const;
const GLYPH_SIZE_PIXELS = 24;
const TEXTURE_SCALE = 4;
const CELL_PADDING_PIXELS = 8;
const CELL_WIDTH = 96 * TEXTURE_SCALE;
const CELL_HEIGHT = (GLYPH_SIZE_PIXELS + CELL_PADDING_PIXELS * 2) * TEXTURE_SCALE;
const TEXTURE_WIDTH = CELL_WIDTH * LABEL_TEXTS.length;
const TEXTURE_HEIGHT = CELL_HEIGHT;

export function createLabelAtlas(context: WebGLRenderingContext): LabelAtlas {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const canvasContext = canvas.getContext('2d');

    if (!canvasContext) {
        throw new Error('WebGL label atlas initialization failed: cannot create Canvas2D context.');
    }

    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    canvasContext.fillStyle = '#ffffff';
    canvasContext.font = `600 ${String(GLYPH_SIZE_PIXELS * TEXTURE_SCALE)}px Arial, sans-serif`;
    canvasContext.textAlign = 'left';
    canvasContext.textBaseline = 'alphabetic';

    const glyphs: Record<LabelText, LabelGlyph> = {
        Front: createEmptyGlyph('Front'),
        Right: createEmptyGlyph('Right'),
        Top: createEmptyGlyph('Top'),
    };

    LABEL_TEXTS.forEach((text, index) => {
        const cellX = index * CELL_WIDTH;
        const metrics = canvasContext.measureText(text);
        const padding = CELL_PADDING_PIXELS * TEXTURE_SCALE;
        const leftBearing = metrics.actualBoundingBoxLeft;
        const rightBearing = metrics.actualBoundingBoxRight;
        const ascent = metrics.actualBoundingBoxAscent;
        const descent = metrics.actualBoundingBoxDescent;
        const glyphWidth = Math.ceil(leftBearing + rightBearing);
        const glyphHeight = Math.ceil(ascent + descent);
        const drawX = cellX + padding + leftBearing;
        const drawBaselineY = padding + ascent;
        const minX = cellX + padding;
        const maxX = minX + glyphWidth;
        const minY = padding;
        const maxY = minY + glyphHeight;

        canvasContext.fillText(text, drawX, drawBaselineY);

        glyphs[text] = {
            text,
            ascentPixels: ascent / TEXTURE_SCALE,
            descentPixels: descent / TEXTURE_SCALE,
            widthPixels: glyphWidth / TEXTURE_SCALE,
            heightPixels: glyphHeight / TEXTURE_SCALE,
            minU: minX / TEXTURE_WIDTH,
            maxU: maxX / TEXTURE_WIDTH,
            minV: minY / TEXTURE_HEIGHT,
            maxV: maxY / TEXTURE_HEIGHT,
        };
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
        texture,
        glyphs,
    };
}

function createEmptyGlyph(text: LabelText): LabelGlyph {
    return {
        text,
        ascentPixels: 0,
        descentPixels: 0,
        widthPixels: 0,
        heightPixels: 0,
        minU: 0,
        maxU: 0,
        minV: 0,
        maxV: 0,
    };
}
