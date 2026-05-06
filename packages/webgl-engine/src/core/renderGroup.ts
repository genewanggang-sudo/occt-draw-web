import { BBox3 } from '@occt-draw/math';
import type { GeometryBounds, RenderObjectOptions } from './renderObject';
import { RenderObject } from './renderObject';

export class RenderGroup extends RenderObject {
    private readonly children: RenderObject[] = [];

    constructor(options: RenderObjectOptions = {}) {
        super('render-group', options);
    }

    public get bounds(): GeometryBounds {
        let bounds: BBox3 | null = null;

        for (const child of this.children) {
            if (!child.visible || !child.bounds) {
                continue;
            }

            bounds = bounds
                ? bounds.expandByPoint(child.bounds.min).expandByPoint(child.bounds.max)
                : new BBox3(child.bounds.min, child.bounds.max);
        }

        return bounds;
    }

    public get objects(): readonly RenderObject[] {
        return this.children;
    }

    public add(object: RenderObject): void {
        if (!this.children.includes(object)) {
            this.children.push(object);
            this.markDirty({ bounds: true, object: true });
        }
    }

    public clear(): void {
        this.children.length = 0;
        this.markDirty({ bounds: true, object: true });
    }

    public remove(object: RenderObject): void {
        const index = this.children.indexOf(object);

        if (index >= 0) {
            this.children.splice(index, 1);
            this.markDirty({ bounds: true, object: true });
        }
    }
}
