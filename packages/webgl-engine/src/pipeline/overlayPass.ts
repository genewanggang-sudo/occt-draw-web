import { renderViewCubeOverlay } from '../viewCube';
import { ViewCube } from '../addon';
import type { RenderPass, RenderPassContext } from './renderPass';

export class OverlayPass implements RenderPass {
    public readonly name = 'overlay';

    public execute({ context, graph, input, resources }: RenderPassContext): void {
        const viewCube = input.viewCube ?? findViewCube(graph)?.toRenderInput();

        if (!viewCube) {
            return;
        }

        renderViewCubeOverlay(context, resources, {
            camera: input.camera,
            hoveredTargetId: viewCube.hoveredTargetId,
            viewportSize: input.viewportSize,
        });
    }
}

function findViewCube(graph: RenderPassContext['graph']): ViewCube | null {
    if (!graph) {
        return null;
    }

    for (const layer of graph.layers) {
        for (const object of layer.objects) {
            if (object instanceof ViewCube) {
                return object;
            }
        }
    }

    return null;
}
