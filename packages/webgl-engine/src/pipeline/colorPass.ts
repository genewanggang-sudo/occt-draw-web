import type { DrawCommand } from './renderQueue';
import type { RenderPass, RenderPassContext } from './renderPass';
import { RenderQueueBuilder } from './renderQueue';

const renderQueueBuilder = new RenderQueueBuilder();

export class ColorPass implements RenderPass {
    public readonly name = 'color';

    public execute({ input, resources }: RenderPassContext): void {
        const queue = renderQueueBuilder.build(input, { glyphs: resources.labelAtlasGlyphs });

        drawCommands(queue.faces, resources.backend.draw.bind(resources.backend));
        drawCommands(queue.edges, resources.backend.draw.bind(resources.backend));
        drawCommands(queue.points, resources.backend.draw.bind(resources.backend));
        drawCommands(queue.markers, resources.backend.draw.bind(resources.backend));
        drawCommands(queue.labels, resources.backend.drawLabels.bind(resources.backend));
    }
}

function drawCommands<TCommand extends DrawCommand>(
    commands: readonly TCommand[],
    draw: (command: TCommand) => void,
): void {
    for (const command of commands) {
        draw(command);
    }
}
