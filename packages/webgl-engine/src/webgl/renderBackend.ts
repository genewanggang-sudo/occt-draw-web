import type { RenderGraph } from '../core';
import type { DrawCommand } from '../pipeline/renderQueue';
import type { CameraState, ViewportSize } from '../types';

export interface RenderBackendFrameInput {
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly viewportSize: ViewportSize;
}

export interface RenderBackend {
    beginFrame(input: RenderBackendFrameInput): void;
    dispose(): void;
    draw(command: Exclude<DrawCommand, { readonly primitiveKind: 'label' }>): void;
    drawLabels(command: Extract<DrawCommand, { readonly primitiveKind: 'label' }>): void;
    endFrame(): void;
    resize(viewportSize: ViewportSize): void;
}
