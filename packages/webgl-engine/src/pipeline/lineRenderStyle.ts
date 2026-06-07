import type { EdgeLineStyle } from '../style';

export type LineStipple = readonly [number, number, number, number];

export interface LineRenderStyle {
    readonly backgroundMixProportion: number;
    readonly filterWidthPx: number;
    readonly stipple: LineStipple;
    readonly widthPx: number;
}

const SOLID_LINE_RENDER_STYLE: LineRenderStyle = {
    backgroundMixProportion: 0,
    filterWidthPx: 1,
    stipple: [12, 0, 12, 0],
    widthPx: 1,
};

const CONSTRUCTION_LINE_RENDER_STYLE: LineRenderStyle = {
    backgroundMixProportion: 0,
    filterWidthPx: 1,
    stipple: [4, 6, 30, 6],
    widthPx: 1,
};

export function resolveLineRenderStyle(style: EdgeLineStyle): LineRenderStyle {
    return style === 'construction' ? CONSTRUCTION_LINE_RENDER_STYLE : SOLID_LINE_RENDER_STYLE;
}

export function resolveSolidLineRenderStyle(): LineRenderStyle {
    return SOLID_LINE_RENDER_STYLE;
}
