import { screenPointToWorldRay, type CameraState, type ViewportSize } from '@occt-draw/canvas';
import type { Plane3 } from '@occt-draw/math';
import { worldPointToSketchPointOnPlane } from '@occt-draw/sketch';
import type { ScreenPoint } from '@occt-draw/platform';

export function projectScreenPointToSketch2(input: {
    readonly camera: CameraState;
    readonly plane: Plane3;
    readonly point: ScreenPoint;
    readonly viewportSize: ViewportSize;
}): { readonly x: number; readonly y: number } | null {
    const ray = screenPointToWorldRay(input.point, input.camera, input.viewportSize);
    const intersection = input.plane.intersectRayResult(ray);

    if (!intersection.success || !intersection.value) {
        return null;
    }

    return worldPointToSketchPointOnPlane(input.plane, intersection.value);
}
