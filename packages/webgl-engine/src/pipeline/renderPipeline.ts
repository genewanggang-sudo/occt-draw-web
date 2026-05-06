import type { RenderPass, RenderPassContext } from './renderPass';

export class RenderPipeline {
    private readonly passes: RenderPass[] = [];

    constructor(passes: readonly RenderPass[] = []) {
        this.passes.push(...passes);
    }

    public addPass(pass: RenderPass): void {
        this.passes.push(pass);
    }

    public execute(context: RenderPassContext): void {
        for (const pass of this.passes) {
            pass.execute(context);
        }
    }
}
