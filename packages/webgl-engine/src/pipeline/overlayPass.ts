import { renderViewCubeOverlay } from '../viewCube';
import { ViewCube } from '../addon';
import type { RenderGraph } from '../core';
import { withWebglStateRestored } from '../webgl';
import type { RenderPass, RenderPassContext } from './renderPass';

export class OverlayPass implements RenderPass {
    public readonly name = 'overlay';

    public execute({ context, input, resources }: RenderPassContext): void {
        const viewCube = findViewCube(input.graph)?.toRenderInput();

        if (!viewCube) {
            return;
        }

        withWebglStateRestored(context, () => {
            renderViewCubeOverlay(context, resources, {
                camera: input.camera,
                hoveredTargetId: viewCube.hoveredTargetId,
                viewportSize: input.viewportSize,
            });
        });
    }
}

function findViewCube(graph: RenderGraph): ViewCube | null {
    for (const layer of graph.layers) {
        for (const object of layer.objects) {
            if (object instanceof ViewCube) {
                return object;
            }
        }
    }

    return null;
}
