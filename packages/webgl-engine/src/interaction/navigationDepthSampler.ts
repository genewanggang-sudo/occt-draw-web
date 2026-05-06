import { sampleNavigationDepths, type NavigationDepthResources } from '../navigationDepth';
import type { NavigationDepthSample, NavigationDepthSampleInput } from '../types';
import { LegacyRenderSceneGraphAdapter } from '../legacy';

export class NavigationDepthSampler {
    private readonly legacyAdapter = new LegacyRenderSceneGraphAdapter();

    constructor(
        private readonly context: WebGL2RenderingContext,
        private readonly canvas: HTMLCanvasElement,
        private readonly resources: NavigationDepthResources,
    ) {}

    public sample(input: NavigationDepthSampleInput): readonly NavigationDepthSample[] {
        if ('graph' in input) {
            return sampleNavigationDepths(this.context, this.canvas, this.resources, {
                area: input.area,
                camera: input.camera,
                includeSecondary: input.includeSecondary,
                scene: this.legacyAdapter.toRenderScene(input.graph, {
                    id: 'navigation-depth-graph',
                    name: 'Navigation Depth Graph',
                }),
                viewportSize: input.viewportSize,
            });
        }

        return sampleNavigationDepths(this.context, this.canvas, this.resources, input);
    }
}
