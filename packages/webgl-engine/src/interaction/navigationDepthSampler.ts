import { sampleNavigationDepths, type NavigationDepthResources } from '../navigationDepth';
import type { NavigationDepthSample, NavigationDepthSampleInput } from '../types';

export class NavigationDepthSampler {
    constructor(
        private readonly context: WebGL2RenderingContext,
        private readonly canvas: HTMLCanvasElement,
        private readonly resources: NavigationDepthResources,
    ) {}

    public sample(input: NavigationDepthSampleInput): readonly NavigationDepthSample[] {
        return sampleNavigationDepths(this.context, this.canvas, this.resources, input);
    }
}
