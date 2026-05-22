import {
    RenderObjectPicker,
    type CameraState,
    type PickTargetKind,
    type RenderGraph,
    type ViewportSize,
} from '@occt-draw/webgl-engine';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export type CanvasPickTargetKind = PickTargetKind;

export interface CanvasPickTarget {
    readonly metadata?: ReadonlyMap<string, unknown>;
    readonly objectId: string;
    readonly primitiveId: string | null;
    readonly targetKind: CanvasPickTargetKind;
}

export interface PickCanvasTargetInput {
    readonly camera: CameraState;
    readonly graph: RenderGraph;
    readonly point: ScreenPoint;
    readonly thresholdPixels: number;
    readonly viewportSize: ViewportSize;
}

export class CanvasPickService {
    private readonly renderObjectPicker = new RenderObjectPicker();

    public pickCanvasTarget(input: PickCanvasTargetInput): CanvasPickTarget | null {
        const pickResult = this.renderObjectPicker.pick(input);

        if (!pickResult) {
            return null;
        }

        const target = {
            objectId: pickResult.key.objectId,
            primitiveId: pickResult.key.primitiveId ?? null,
            targetKind: pickResult.key.kind,
        };

        return pickResult.metadata ? { ...target, metadata: pickResult.metadata } : target;
    }
}
