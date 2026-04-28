import type { ReferencePlaneKind } from '@occt-draw/core';
import {
    addVector3,
    createPlane,
    createRay3,
    crossVector3,
    intersectRayWithPlane,
    normalizeVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { CameraState, ViewportSize } from '@occt-draw/renderer';
import { worldPointToSketchPoint2 } from '@occt-draw/sketch';
import type { ScreenPoint } from '../view-navigation/viewNavigation';

export function projectScreenPointToSketch2(input: {
    readonly camera: CameraState;
    readonly planeKind: ReferencePlaneKind;
    readonly point: ScreenPoint;
    readonly viewportSize: ViewportSize;
}): { readonly x: number; readonly y: number } | null {
    const ray = createOrthographicScreenRay(input.camera, input.point, input.viewportSize);
    const plane = createPlane(getPlaneOrigin(input.planeKind), getPlaneNormal(input.planeKind));
    const worldPoint = intersectRayWithPlane(ray, plane);

    if (!worldPoint) {
        return null;
    }

    return worldPointToSketchPoint2(input.planeKind, worldPoint);
}

function createOrthographicScreenRay(
    camera: CameraState,
    point: ScreenPoint,
    viewportSize: ViewportSize,
) {
    const basis = calculateCameraBasis(camera);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const halfHeight = camera.orthographicHeight / 2;
    const halfWidth = halfHeight * aspect;
    const offsetX = ((point.x / viewportSize.width) * 2 - 1) * halfWidth;
    const offsetY = (1 - (point.y / viewportSize.height) * 2) * halfHeight;
    const origin = addVector3(
        addVector3(camera.position, scaleVector3(basis.right, offsetX)),
        scaleVector3(basis.up, offsetY),
    );

    return createRay3(origin, scaleVector3(basis.view, -1));
}

function calculateCameraBasis(camera: CameraState): {
    readonly right: Vector3;
    readonly up: Vector3;
    readonly view: Vector3;
} {
    const view = normalizeVector3(subtractVector3(camera.position, camera.target));
    const right = normalizeVector3(crossVector3(camera.up, view));
    const up = normalizeVector3(crossVector3(view, right));

    return { right, up, view };
}

function getPlaneOrigin(_planeKind: ReferencePlaneKind): Vector3 {
    return { x: 0, y: 0, z: 0 };
}

function getPlaneNormal(planeKind: ReferencePlaneKind): Vector3 {
    if (planeKind === 'yz') {
        return { x: 1, y: 0, z: 0 };
    }

    if (planeKind === 'zx') {
        return { x: 0, y: 1, z: 0 };
    }

    return { x: 0, y: 0, z: 1 };
}
