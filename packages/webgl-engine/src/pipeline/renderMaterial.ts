import { Vec3, type Vector3 } from '@occt-draw/math';
import type { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from '../style';
import {
    resolveLineRenderStyle,
    resolveSolidLineRenderStyle,
    type LineStipple,
} from './lineRenderStyle';

export type ShaderVariantKey = 'label' | 'marker' | 'point' | 'solid';
export type RenderDepthFunc = 'lequal' | 'less';

export interface RenderState {
    readonly blend: boolean;
    readonly depthFunc: RenderDepthFunc;
    readonly depthTest: boolean;
    readonly depthWrite: boolean;
    readonly polygonOffset: boolean;
}

export interface RenderMaterial {
    readonly alpha: number;
    readonly color: Vector3;
    readonly lineBackgroundMixProportion: number;
    readonly lineFilterWidthPx: number;
    readonly lineStipple: LineStipple;
    readonly lineWidthPx: number;
    readonly pointSize: number;
    readonly renderState: RenderState;
    readonly shaderVariantKey: ShaderVariantKey;
}

export type { LineStipple };

const OPAQUE_RENDER_STATE: RenderState = {
    blend: false,
    depthFunc: 'less',
    depthTest: true,
    depthWrite: true,
    polygonOffset: false,
};

const TRANSPARENT_RENDER_STATE: RenderState = {
    blend: true,
    depthFunc: 'less',
    depthTest: true,
    depthWrite: false,
    polygonOffset: false,
};

const EDGE_RENDER_STATE: RenderState = {
    blend: true,
    depthFunc: 'less',
    depthTest: true,
    depthWrite: true,
    polygonOffset: false,
};

const LABEL_RENDER_STATE: RenderState = {
    blend: true,
    depthFunc: 'less',
    depthTest: false,
    depthWrite: false,
    polygonOffset: false,
};

const HIGHLIGHT_RENDER_STATE: RenderState = {
    blend: true,
    depthFunc: 'lequal',
    depthTest: true,
    depthWrite: false,
    polygonOffset: false,
};

const OVERLAY_HIGHLIGHT_RENDER_STATE: RenderState = {
    blend: true,
    depthFunc: 'less',
    depthTest: false,
    depthWrite: false,
    polygonOffset: false,
};

const DEFAULT_MATERIAL_COLOR = Vec3.of(1, 1, 1);

export interface HighlightLineMaterialInput {
    readonly alpha: number;
    readonly color: Vector3;
    readonly depthMode: 'overlay' | 'scene';
    readonly widthPx: number;
}

export function resolveFaceMaterial(style: FaceStyle): RenderMaterial {
    const lineStyle = resolveSolidLineRenderStyle();

    return {
        alpha: style.opacity,
        color: style.color,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: lineStyle.widthPx,
        pointSize: 1,
        renderState: style.opacity < 1 ? TRANSPARENT_RENDER_STATE : OPAQUE_RENDER_STATE,
        shaderVariantKey: 'solid',
    };
}

export function resolveEdgeMaterial(style: EdgeStyle): RenderMaterial {
    const lineStyle = resolveLineRenderStyle(style.lineStyle);

    return {
        alpha: 1,
        color: style.color,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: lineStyle.widthPx,
        pointSize: 1,
        renderState: EDGE_RENDER_STATE,
        shaderVariantKey: 'solid',
    };
}

export function resolvePointMaterial(style: PointStyle): RenderMaterial {
    const lineStyle = resolveSolidLineRenderStyle();

    return {
        alpha: 1,
        color: style.color,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: lineStyle.widthPx,
        pointSize: style.sizePixels,
        renderState: TRANSPARENT_RENDER_STATE,
        shaderVariantKey: 'point',
    };
}

export function resolveMarkerMaterial(_style: MarkerStyle): RenderMaterial {
    const lineStyle = resolveSolidLineRenderStyle();

    return {
        alpha: 1,
        color: DEFAULT_MATERIAL_COLOR,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: lineStyle.widthPx,
        pointSize: 1,
        renderState: TRANSPARENT_RENDER_STATE,
        shaderVariantKey: 'marker',
    };
}

export function resolveTextMaterial(_style: TextStyle): RenderMaterial {
    const lineStyle = resolveSolidLineRenderStyle();

    return {
        alpha: 1,
        color: DEFAULT_MATERIAL_COLOR,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: lineStyle.widthPx,
        pointSize: 1,
        renderState: LABEL_RENDER_STATE,
        shaderVariantKey: 'label',
    };
}

export function resolveHighlightLineMaterial(input: HighlightLineMaterialInput): RenderMaterial {
    const lineStyle = resolveSolidLineRenderStyle();

    return {
        alpha: input.alpha,
        color: input.color,
        lineBackgroundMixProportion: lineStyle.backgroundMixProportion,
        lineFilterWidthPx: lineStyle.filterWidthPx,
        lineStipple: lineStyle.stipple,
        lineWidthPx: input.widthPx,
        pointSize: 1,
        renderState:
            input.depthMode === 'overlay' ? OVERLAY_HIGHLIGHT_RENDER_STATE : HIGHLIGHT_RENDER_STATE,
        shaderVariantKey: 'solid',
    };
}

export class RenderMaterialResolver {
    public edge(style: EdgeStyle): RenderMaterial {
        return resolveEdgeMaterial(style);
    }

    public face(style: FaceStyle): RenderMaterial {
        return resolveFaceMaterial(style);
    }

    public marker(style: MarkerStyle): RenderMaterial {
        return resolveMarkerMaterial(style);
    }

    public point(style: PointStyle): RenderMaterial {
        return resolvePointMaterial(style);
    }

    public text(style: TextStyle): RenderMaterial {
        return resolveTextMaterial(style);
    }
}
