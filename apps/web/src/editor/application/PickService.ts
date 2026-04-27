import type { SelectionTarget } from '@occt-draw/core';
import { pickSceneObject, type CameraState, type ViewportSize } from '@occt-draw/renderer';
import type { SceneDocument } from '@occt-draw/scene';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export interface PickSelectionTargetInput {
    readonly camera: CameraState;
    readonly point: ScreenPoint;
    readonly scene: SceneDocument;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export class PickService {
    pickSelectionTarget(input: PickSelectionTargetInput): SelectionTarget | null {
        const pickResult = pickSceneObject(input);

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
