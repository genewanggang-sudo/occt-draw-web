import type { DisplayModel } from '@occt-draw/display';
import {
    addVector3,
    createVector3,
    crossVector3,
    dotVector3,
    normalizeVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import {
    calculateBoundingSphere,
    calculateDisplayBoundingBox,
    getBoundingBoxCorners,
} from './bounds';
import type { BoundingBox3, CameraState, ViewportSize } from './types';

export type StandardCameraView =
    | 'back'
    | 'bottom'
    | 'front'
    | 'isometric'
    | 'left'
    | 'right'
    | 'top';

export const DEFAULT_CAMERA_STATE: CameraState = {
    projection: 'orthographic',
    position: createVector3(6, 4.5, 6),
    target: createVector3(0, 0.5, 0),
    up: createVector3(0, 1, 0),
    orthographicHeight: 9,
    fovYRadians: Math.PI / 4,
    near: 0.1,
    far: 100,
};

interface CameraBasis {
    readonly right: Vector3;
    readonly up: Vector3;
    readonly view: Vector3;
}

export function createCameraStateForDisplay(displayModel: DisplayModel): CameraState {
    return createStandardCameraState(calculateDisplayBoundingBox(displayModel), 'isometric');
}

export function createStandardCameraState(
    bounds: BoundingBox3,
    view: StandardCameraView,
    viewportSize?: ViewportSize,
): CameraState {
    const baseCamera = createCameraFromView(bounds, view);

    if (!viewportSize) {
        return baseCamera;
    }

    return fitCameraToBounds(baseCamera, bounds, viewportSize);
}

export function fitCameraToBounds(
    camera: CameraState,
    bounds: BoundingBox3,
    viewportSize: ViewportSize,
): CameraState {
    const sphere = calculateBoundingSphere(bounds);
    const basis = calculateCameraBasis(camera);
    const corners = getBoundingBoxCorners(bounds);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
        const relative = subtractVector3(corner, sphere.center);
        const x = dotVector3(relative, basis.right);
        const y = dotVector3(relative, basis.up);
        const z = dotVector3(relative, basis.view);

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
    }

    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);
    const contentDepth = Math.max(maxZ - minZ, 1);
    const orthographicHeight = Math.max(contentHeight, contentWidth / aspect) * 1.18;
    const distance = Math.max(sphere.radius * 3.5, contentDepth * 2, 1);
    const position = addVector3(sphere.center, scaleVector3(basis.view, distance));

    return {
        ...camera,
        position,
        target: sphere.center,
        orthographicHeight,
        near: Math.max(distance - contentDepth * 3 - 1, 0.01),
        far: distance + contentDepth * 3 + 1,
    };
}

function createCameraFromView(bounds: BoundingBox3, view: StandardCameraView): CameraState {
    const sphere = calculateBoundingSphere(bounds);
    const viewDirection = getStandardViewDirection(view);
    const distance = sphere.radius * 3.5;

    return {
        projection: 'orthographic',
        position: addVector3(sphere.center, scaleVector3(viewDirection, distance)),
        target: sphere.center,
        up: getStandardViewUp(view),
        orthographicHeight: sphere.radius * 2.4,
        fovYRadians: Math.PI / 4,
        near: 0.1,
        far: sphere.radius * 12,
    };
}

function getStandardViewDirection(view: StandardCameraView): Vector3 {
    if (view === 'front') {
        return createVector3(0, 0, 1);
    }

    if (view === 'back') {
        return createVector3(0, 0, -1);
    }

    if (view === 'right') {
        return createVector3(1, 0, 0);
    }

    if (view === 'left') {
        return createVector3(-1, 0, 0);
    }

    if (view === 'top') {
        return createVector3(0, 1, 0);
    }

    if (view === 'bottom') {
        return createVector3(0, -1, 0);
    }

    return normalizeVector3(createVector3(1, 0.75, 1));
}

function getStandardViewUp(view: StandardCameraView): Vector3 {
    if (view === 'top' || view === 'bottom') {
        return createVector3(0, 0, -1);
    }

    return createVector3(0, 1, 0);
}

function calculateCameraBasis(camera: CameraState): CameraBasis {
    const view = normalizeVector3(subtractVector3(camera.position, camera.target));
    const right = normalizeVector3(crossVector3(camera.up, view));
    const up = normalizeVector3(crossVector3(view, right));

    return { right, up, view };
}
