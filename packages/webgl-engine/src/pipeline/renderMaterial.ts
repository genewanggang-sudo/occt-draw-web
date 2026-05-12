import { Vec3, type Vector3 } from '@occt-draw/math';
import type { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from '../style';

export type ShaderVariantKey = 'label' | 'marker' | 'point' | 'solid';

export interface RenderState {
    readonly blend: boolean;
    readonly depthTest: boolean;
    readonly depthWrite: boolean;
    readonly polygonOffset: boolean;
}

export interface RenderMaterial {
    readonly alpha: number;
    readonly color: Vector3;
    readonly pointSize: number;
    readonly renderState: RenderState;
    readonly shaderVariantKey: ShaderVariantKey;
}

const OPAQUE_RENDER_STATE: RenderState = {
    blend: false,
    depthTest: true,
    depthWrite: true,
    polygonOffset: false,
};

const TRANSPARENT_RENDER_STATE: RenderState = {
    blend: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: false,
};

const LABEL_RENDER_STATE: RenderState = {
    blend: true,
    depthTest: false,
    depthWrite: false,
    polygonOffset: false,
};

const DEFAULT_MATERIAL_COLOR = Vec3.of(1, 1, 1);

export function resolveFaceMaterial(style: FaceStyle): RenderMaterial {
    return {
        alpha: style.opacity,
        color: style.color,
        pointSize: 1,
        renderState: style.opacity < 1 ? TRANSPARENT_RENDER_STATE : OPAQUE_RENDER_STATE,
        shaderVariantKey: 'solid',
    };
}

export function resolveEdgeMaterial(style: EdgeStyle): RenderMaterial {
    return {
        alpha: 1,
        color: style.color,
        pointSize: 1,
        renderState: OPAQUE_RENDER_STATE,
        shaderVariantKey: 'solid',
    };
}

export function resolvePointMaterial(style: PointStyle): RenderMaterial {
    return {
        alpha: 1,
        color: style.color,
        pointSize: style.sizePixels,
        renderState: TRANSPARENT_RENDER_STATE,
        shaderVariantKey: 'point',
    };
}

export function resolveMarkerMaterial(_style: MarkerStyle): RenderMaterial {
    return {
        alpha: 1,
        color: DEFAULT_MATERIAL_COLOR,
        pointSize: 1,
        renderState: TRANSPARENT_RENDER_STATE,
        shaderVariantKey: 'marker',
    };
}

export function resolveTextMaterial(_style: TextStyle): RenderMaterial {
    return {
        alpha: 1,
        color: DEFAULT_MATERIAL_COLOR,
        pointSize: 1,
        renderState: LABEL_RENDER_STATE,
        shaderVariantKey: 'label',
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
