import type { RenderScene, RenderNode } from './types';

export function createRenderScene(
    id: string,
    name: string,
    nodes: readonly RenderNode[],
): RenderScene {
    return {
        id,
        name,
        nodes,
    };
}
