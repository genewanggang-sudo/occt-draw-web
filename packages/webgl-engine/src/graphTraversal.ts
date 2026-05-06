import type { RenderGraph, RenderLayer, RenderObject } from './core';
import type { RenderDepthRole } from './types';

export interface RenderGraphObjectEntry {
    readonly layer: RenderLayer;
    readonly object: RenderObject;
}

export function collectSceneGraphObjects(graph: RenderGraph): readonly RenderGraphObjectEntry[] {
    return collectGraphObjects(graph, (layer, object) => {
        return layer.depthPolicy === 'scene' && layer.visible && object.visible;
    });
}

export function collectPickableGraphObjects(graph: RenderGraph): readonly RenderGraphObjectEntry[] {
    return collectGraphObjects(graph, (layer, object) => {
        return (
            layer.depthPolicy === 'scene' &&
            layer.pickable &&
            layer.visible &&
            object.pickable &&
            object.visible &&
            object.depthRole !== 'excluded'
        );
    });
}

export function collectNavigationDepthGraphObjects(
    graph: RenderGraph,
    includeSecondary: boolean,
): readonly RenderGraphObjectEntry[] {
    return collectGraphObjects(graph, (layer, object) => {
        if (!layer.visible || !object.visible || layer.depthPolicy === 'overlay') {
            return false;
        }

        const role = resolveNavigationDepthRole(layer, object);

        if (role === 'excluded') {
            return false;
        }

        return includeSecondary || role === 'primary';
    });
}

export function resolveNavigationDepthRole(
    layer: RenderLayer,
    object: RenderObject,
): RenderDepthRole {
    return layer.navigationRole === 'inherit' ? object.depthRole : layer.navigationRole;
}

function collectGraphObjects(
    graph: RenderGraph,
    shouldInclude: (layer: RenderLayer, object: RenderObject) => boolean,
): readonly RenderGraphObjectEntry[] {
    const entries: RenderGraphObjectEntry[] = [];

    for (const layer of graph.layers) {
        for (const object of layer.objects) {
            if (shouldInclude(layer, object)) {
                entries.push({ layer, object });
            }
        }
    }

    return entries;
}
