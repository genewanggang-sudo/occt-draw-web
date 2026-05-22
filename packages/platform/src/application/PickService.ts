import type { SelectionTarget } from '@occt-draw/core';
import { CanvasPickService, type PickCanvasTargetInput } from '@occt-draw/canvas';

export type PickSelectionTargetInput = PickCanvasTargetInput;

export class PickService {
    private readonly canvasPickService = new CanvasPickService();

    public pickSelectionTarget(input: PickSelectionTargetInput): SelectionTarget | null {
        const pickResult = this.canvasPickService.pickCanvasTarget(input);

        if (!pickResult) {
            return null;
        }

        const target = {
            objectId: pickResult.objectId,
            primitiveId: pickResult.primitiveId,
            targetKind: pickResult.targetKind,
        };

        return pickResult.metadata ? { ...target, metadata: pickResult.metadata } : target;
    }
}
