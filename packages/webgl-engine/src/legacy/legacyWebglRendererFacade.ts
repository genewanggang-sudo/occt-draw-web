import type { RenderEngine } from '../types';
import { LegacyRenderSceneGraphAdapter } from './legacyRenderSceneGraphAdapter';
import type { RenderFrameInput } from './legacyTypes';

export class LegacyWebglRendererFacade {
    private readonly adapter = new LegacyRenderSceneGraphAdapter();

    constructor(private readonly engine: RenderEngine) {}

    public dispose(): void {
        this.engine.dispose();
    }

    public render(input: RenderFrameInput): void {
        const graph = this.adapter.toGraph(input.scene);

        this.engine.resize(input.viewportSize);
        this.engine.setGraph(graph);
        this.engine.render(input.camera);
    }

    public resize(viewportSize: RenderFrameInput['viewportSize']): void {
        this.engine.resize(viewportSize);
    }

    public sampleNavigationDepths(input: Parameters<RenderEngine['sampleNavigationDepths']>[0]) {
        return this.engine.sampleNavigationDepths(input);
    }
}
