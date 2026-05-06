import type { RenderScene } from '@occt-draw/cad-rendering';
import type { SelectionTarget } from '@occt-draw/core';
import { RenderObjectPicker, type CameraState, type ViewportSize } from '@occt-draw/webgl-engine';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export interface PickSelectionTargetInput {
    readonly camera: CameraState;
    readonly scene: RenderScene;
    readonly point: ScreenPoint;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export class PickService {
    private readonly renderObjectPicker = new RenderObjectPicker();

    public pickSelectionTarget(input: PickSelectionTargetInput): SelectionTarget | null {
        const pickResult = this.renderObjectPicker.pick(input);

        if (!pickResult) {
            return null;
        }

        return {
            objectId: pickResult.key.objectId,
            primitiveId: pickResult.key.primitiveId ?? null,
            targetKind: pickResult.key.kind,
        };
    }
}
