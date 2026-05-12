import type { RenderGraph } from '../core';
import type { DrawCommand } from '../pipeline/renderQueue';
import type { CameraState, LabelVertex, Matrix4, RenderVertex, ViewportSize } from '../types';

export interface RenderBackendFrameInput {
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly viewportSize: ViewportSize;
}

export type ImmediateDepthFunc = 'lequal' | 'less';
export type ImmediateDrawMode = 'lines' | 'points' | 'triangles';
export type ImmediatePointShape = 'circle' | 'halo' | 'marker' | 'none' | 'ring';
export type ImmediateCullFace = 'back' | 'front' | 'none';

export interface ImmediateRenderState {
    readonly blend?: boolean;
    readonly clearDepthBuffer?: boolean;
    readonly cullFace?: ImmediateCullFace;
    readonly depthFunc?: ImmediateDepthFunc;
    readonly depthTest?: boolean;
    readonly depthWrite?: boolean;
}

export interface ImmediatePrimitiveDrawInput {
    readonly drawMode: ImmediateDrawMode;
    readonly matrix?: Matrix4;
    readonly pointShape?: ImmediatePointShape;
    readonly pointSize?: number;
    readonly state?: ImmediateRenderState;
    readonly vertices: readonly RenderVertex[];
}

export interface ImmediateLabelDrawInput {
    readonly matrix: Matrix4;
    readonly state?: ImmediateRenderState;
    readonly vertices: readonly LabelVertex[];
}

export interface RenderBackend {
    beginFrame(input: RenderBackendFrameInput): void;
    dispose(): void;
    draw(command: Exclude<DrawCommand, { readonly primitiveKind: 'label' }>): void;
    drawImmediateLabels(input: ImmediateLabelDrawInput): void;
    drawImmediatePrimitives(input: ImmediatePrimitiveDrawInput): void;
    drawLabels(command: Extract<DrawCommand, { readonly primitiveKind: 'label' }>): void;
    endFrame(): void;
    resize(viewportSize: ViewportSize): void;
}
