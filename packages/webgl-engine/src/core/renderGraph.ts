import { BBox3, Vec3 } from '@occt-draw/math';
import type { BoundingBox3 } from '../types';
import type { RenderLayer } from './renderLayer';
import type { GeometryBounds, RenderObject } from './renderObject';

const DEFAULT_GRAPH_BOUNDS = new BBox3(Vec3.of(-1, -1, -1), Vec3.of(1, 1, 1));

export class RenderGraph {
    private readonly renderLayers: RenderLayer[] = [];

    public get bounds(): BoundingBox3 {
        return this.calculateBounds(() => true);
    }

    public get layers(): readonly RenderLayer[] {
        return this.renderLayers;
    }

    public get navigationBounds(): BoundingBox3 {
        return this.calculateBounds((object, layer) => {
            if (layer.navigationRole === 'excluded') {
                return false;
            }

            return object.depthRole !== 'excluded' && object.bounds !== null;
        });
    }

    public addLayer(layer: RenderLayer): void {
        if (!this.renderLayers.includes(layer)) {
            this.renderLayers.push(layer);
        }
    }

    public clear(): void {
        this.renderLayers.length = 0;
    }

    public removeLayer(layer: RenderLayer): void {
        const index = this.renderLayers.indexOf(layer);

        if (index >= 0) {
            this.renderLayers.splice(index, 1);
        }
    }

    private calculateBounds(
        shouldInclude: (object: RenderObject, layer: RenderLayer) => boolean,
    ): BoundingBox3 {
        let bounds: BBox3 | null = null;

        for (const layer of this.renderLayers) {
            if (!layer.visible) {
                continue;
            }

            for (const object of layer.objects) {
                if (!object.visible || !shouldInclude(object, layer)) {
                    continue;
                }

                bounds = expandBounds(bounds, object.bounds);
            }
        }

        return bounds ?? DEFAULT_GRAPH_BOUNDS;
    }
}

function expandBounds(bounds: BBox3 | null, nextBounds: GeometryBounds): BBox3 | null {
    if (!nextBounds) {
        return bounds;
    }

    return bounds
        ? bounds.expandByPoint(nextBounds.min).expandByPoint(nextBounds.max)
        : new BBox3(nextBounds.min, nextBounds.max);
}
