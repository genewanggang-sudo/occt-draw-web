import { Vec3, type Vector3 } from '@occt-draw/math';

const DEFAULT_COLOR = Vec3.of(1, 1, 1);

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

    constructor(input: { readonly color?: Vector3 } = {}) {
        this.color = input.color ?? DEFAULT_COLOR;
    }
}

export class PointStyle {
    public readonly color: Vector3;
    public readonly sizePixels: number;

    constructor(input: { readonly color?: Vector3; readonly sizePixels?: number } = {}) {
        this.color = input.color ?? DEFAULT_COLOR;
        this.sizePixels = input.sizePixels ?? 7;
    }
}

export class MarkerStyle {
    public readonly kind = 'marker-style';
}

export class TextStyle {
    public readonly kind = 'text-style';
}
