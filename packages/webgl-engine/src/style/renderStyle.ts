import { Vec3, type Vector3 } from '@occt-draw/math';

const DEFAULT_COLOR = Vec3.of(1, 1, 1);

export type EdgeLineStyle = 'construction' | 'solid';
export type PointRenderMode = 'billboard-font' | 'primitive';
export type PointShape = 'circle' | 'ring';

export interface PointFont {
    readonly angularSegmentCount: number;
    readonly radialSegmentCount: number;
    readonly ringFillPercent: number;
}

export class FaceStyle {
    public readonly color: Vector3;
    public readonly opacity: number;

    constructor(input: { readonly color?: Vector3; readonly opacity?: number } = {}) {
        this.color = input.color ?? DEFAULT_COLOR;
        this.opacity = input.opacity ?? 1;
    }
}

export class EdgeStyle {
    public readonly color: Vector3;
    public readonly lineStyle: EdgeLineStyle;

    constructor(input: { readonly color?: Vector3; readonly lineStyle?: EdgeLineStyle } = {}) {
        this.color = input.color ?? DEFAULT_COLOR;
        this.lineStyle = input.lineStyle ?? 'solid';
    }
}

export class PointStyle {
    public readonly color: Vector3;
    public readonly pointFont: PointFont;
    public readonly pointRenderMode: PointRenderMode;
    public readonly pointShape: PointShape;
    public readonly sizePixels: number;
    public readonly strokeColor: Vector3;
    public readonly strokeWidthPixels: number;

    constructor(
        input: {
            readonly color?: Vector3;
            readonly pointFont?: PointFont;
            readonly pointRenderMode?: PointRenderMode;
            readonly pointShape?: PointShape;
            readonly sizePixels?: number;
            readonly strokeColor?: Vector3;
            readonly strokeWidthPixels?: number;
        } = {},
    ) {
        this.color = input.color ?? DEFAULT_COLOR;
        this.pointRenderMode = input.pointRenderMode ?? 'primitive';
        this.pointShape = input.pointShape ?? 'circle';
        this.pointFont = input.pointFont ?? resolveDefaultPointFont(this.pointShape);
        this.sizePixels = input.sizePixels ?? 7;
        this.strokeColor = input.strokeColor ?? this.color;
        this.strokeWidthPixels = input.strokeWidthPixels ?? 0;
    }
}

function resolveDefaultPointFont(pointShape: PointShape): PointFont {
    if (pointShape === 'ring') {
        return {
            angularSegmentCount: 0,
            radialSegmentCount: 2,
            ringFillPercent: 50,
        };
    }

    return {
        angularSegmentCount: 0,
        radialSegmentCount: 1,
        ringFillPercent: 50,
    };
}

export class MarkerStyle {
    public readonly kind = 'marker-style';
}

export class TextStyle {
    public readonly kind = 'text-style';
}
