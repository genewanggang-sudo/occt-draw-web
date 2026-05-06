import type { RenderDepthRole } from '../types';
import type { RenderObject } from './renderObject';

export type RenderLayerDepthPolicy = 'overlay' | 'scene';
export type RenderLayerNavigationRole = RenderDepthRole | 'inherit';
export type RenderLayerSortPolicy = 'insertion' | 'none';

export interface RenderLayerOptions {
    readonly depthPolicy?: RenderLayerDepthPolicy;
    readonly navigationRole?: RenderLayerNavigationRole;
    readonly pickable?: boolean;
    readonly sortPolicy?: RenderLayerSortPolicy;
    readonly visible?: boolean;
}

export class RenderLayer {
    public readonly depthPolicy: RenderLayerDepthPolicy;
    public readonly name: string;
    public readonly navigationRole: RenderLayerNavigationRole;
    public readonly pickable: boolean;
    public readonly sortPolicy: RenderLayerSortPolicy;
    public visible: boolean;
    private readonly renderObjects: RenderObject[] = [];

    constructor(name: string, options: RenderLayerOptions = {}) {
        this.name = name;
        this.visible = options.visible ?? true;
        this.pickable = options.pickable ?? true;
        this.depthPolicy = options.depthPolicy ?? 'scene';
        this.sortPolicy = options.sortPolicy ?? 'insertion';
        this.navigationRole = options.navigationRole ?? 'inherit';
    }

    public get objects(): readonly RenderObject[] {
        return this.renderObjects;
    }

    public add(object: RenderObject): void {
        if (!this.renderObjects.includes(object)) {
            this.renderObjects.push(object);
        }
    }

    public clear(): void {
        this.renderObjects.length = 0;
    }

    public remove(object: RenderObject): void {
        const index = this.renderObjects.indexOf(object);

        if (index >= 0) {
            this.renderObjects.splice(index, 1);
        }
    }
}
