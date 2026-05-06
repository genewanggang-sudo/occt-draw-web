import type { GeometryBounds, RenderObjectOptions } from '../core';
import { RenderObject } from '../core';

export abstract class ViewportWidget extends RenderObject {
    public readonly bounds: GeometryBounds = null;

    protected constructor(kind: string, options: RenderObjectOptions = {}) {
        super(kind, {
            depthRole: 'excluded',
            pickable: false,
            ...options,
        });
    }
}
