import type { DisplayModel } from '@occt-draw/display';
import type { SelectionTarget } from '@occt-draw/core';
import { pickDisplayObject, type CameraState, type ViewportSize } from '@occt-draw/renderer';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export interface PickSelectionTargetInput {
    readonly camera: CameraState;
    readonly displayModel: DisplayModel;
    readonly point: ScreenPoint;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export class PickService {
    pickSelectionTarget(input: PickSelectionTargetInput): SelectionTarget | null {
        const pickResult = pickDisplayObject(input);

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
