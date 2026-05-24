import { referencePlaneToPlane, type PartStudio } from '@occt-draw/cad-model';
import { screenPointToWorldRay, type CameraState, type ViewportSize } from '@occt-draw/canvas';
import { worldPointToSketchPointOnPlane, type SketchPlaneObjectRef } from '@occt-draw/sketch';
import type { ScreenPoint } from '@occt-draw/platform';

export function projectScreenPointToSketch2(input: {
    readonly camera: CameraState;
    readonly partStudio: PartStudio;
    readonly planeObjectRef: SketchPlaneObjectRef;
    readonly point: ScreenPoint;
    readonly viewportSize: ViewportSize;
}): { readonly x: number; readonly y: number } | null {
    const planeObject = input.partStudio.findObjectById(input.planeObjectRef.id);

    if (planeObject?.kind !== 'reference-plane') {
        return null;
    }

    const ray = screenPointToWorldRay(input.point, input.camera, input.viewportSize);
    const plane = referencePlaneToPlane(planeObject);
    const intersection = plane.intersectRayResult(ray);

    if (!intersection.success || !intersection.value) {
        return null;
    }

    return worldPointToSketchPointOnPlane(plane, intersection.value);
}
