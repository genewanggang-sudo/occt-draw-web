import { pickRenderNode, type PickRenderNodeInput, type PickTargetKind } from '../picking';
import type { ScreenPoint2 } from '../types';

export interface PickKey {
    readonly kind: PickTargetKind;
    readonly objectId: string;
    readonly primitiveId?: string;
}

export interface PickResult {
    readonly canvasPoint: ScreenPoint2;
    readonly depth01?: number;
    readonly distancePixels?: number;
    readonly key: PickKey;
    readonly worldPoint?: unknown;
}

export class RenderObjectPicker {
    public pick(input: PickRenderNodeInput): PickResult | null {
        const result = pickRenderNode(input);

        if (!result) {
            return null;
        }

        return {
            canvasPoint: input.point,
            distancePixels: result.distancePixels,
            key:
                result.primitiveId === null
                    ? {
                          kind: result.targetKind,
                          objectId: result.objectId,
                      }
                    : {
                          kind: result.targetKind,
                          objectId: result.objectId,
                          primitiveId: result.primitiveId,
                      },
            worldPoint: result.worldPoint,
        };
    }
}
