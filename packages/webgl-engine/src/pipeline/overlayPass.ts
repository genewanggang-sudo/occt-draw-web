import { createViewCubeOverlayModel } from '../viewCube';
import { ViewCube } from '../addon';
import type { RenderGraph } from '../core';
import type { RenderPass, RenderPassContext } from './renderPass';

export class OverlayPass implements RenderPass {
    public readonly name = 'overlay';

    public execute({ input, resources }: RenderPassContext): void {
        const viewCube = findViewCube(input.graph)?.toRenderInput();

        if (!viewCube) {
            return;
        }

        const model = createViewCubeOverlayModel({
            camera: input.camera,
            glyphs: resources.labelAtlasGlyphs,
            hoveredTargetId: viewCube.hoveredTargetId,
            viewportSize: input.viewportSize,
        });

        for (const command of model.commands) {
            if (command.kind === 'labels') {
                resources.backend.drawImmediateLabels(command);
            } else {
                resources.backend.drawImmediatePrimitives(command);
            }
        }
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
