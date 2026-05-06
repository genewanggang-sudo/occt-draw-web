import { RenderGraph, RenderLayer } from '../core';
import type { RenderNode, RenderScene } from '../types';
import { LegacyRenderNodeToObjectMapper } from './legacyRenderNodeToObjectMapper';
import { RenderObjectToLegacyNodeMapper } from './renderObjectToLegacyNodeMapper';

const LEGACY_SCENE_LAYER = 'legacy-scene';

export class LegacyRenderSceneGraphAdapter {
    private readonly nodeToObjectMapper = new LegacyRenderNodeToObjectMapper();
    private readonly objectToNodeMapper = new RenderObjectToLegacyNodeMapper();

    public toGraph(scene: RenderScene): RenderGraph {
        const graph = new RenderGraph();
        const sceneLayer = new RenderLayer(LEGACY_SCENE_LAYER);

        for (const node of scene.nodes) {
            sceneLayer.add(this.nodeToObjectMapper.map(node));
        }

        graph.addLayer(sceneLayer);

        return graph;
    }

    public toRenderScene(
        graph: RenderGraph,
        fallback: { readonly id: string; readonly name: string },
    ): RenderScene {
        const nodes: RenderNode[] = [];

        for (const layer of graph.layers) {
            for (const object of layer.objects) {
                const node = this.objectToNodeMapper.map(object, layer.visible);

                if (node) {
                    nodes.push(node);
                }
            }
        }

        return {
            id: fallback.id,
            name: fallback.name,
            nodes,
        };
    }
}
