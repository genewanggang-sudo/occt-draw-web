import type { RenderScene } from '@occt-draw/cad-rendering';
import type { SelectionTarget } from '@occt-draw/core';
import { pickRenderNode, type CameraState, type ViewportSize } from '@occt-draw/webgl-engine';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export interface PickSelectionTargetInput {
    readonly camera: CameraState;
    readonly scene: RenderScene;
    readonly point: ScreenPoint;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export class PickService {
    public pickSelectionTarget(input: PickSelectionTargetInput): SelectionTarget | null {
        const pickResult = pickRenderNode(input);

        if (!pickResult) {
            return null;
        }

        return {
            objectId: pickResult.objectId,
            primitiveId: pickResult.primitiveId,
            targetKind: pickResult.targetKind,
        };
    }
}
