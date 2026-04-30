import type { RenderScene } from './types';
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
    calculateRenderSceneNavigationBoundingBox,
    getBoundingBoxCorners,
} from './bounds';
import type { BoundingBox3, CameraState, ScreenPoint2, ViewportSize } from './types';

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
    position: createVector3(6, 6, 4.5),
    target: createVector3(0, 0, 0),
    up: createVector3(0, 0, 1),
    orthographicHeight: 9,
    fovYRadians: Math.PI / 4,
    near: 0.1,
    far: 100,
};

interface CameraBasis {
    readonly forward: Vector3;
    readonly right: Vector3;
    readonly up: Vector3;
    readonly view: Vector3;
}

export function createCameraStateForScene(scene: RenderScene): CameraState {
    return createStandardCameraState(calculateRenderSceneNavigationBoundingBox(scene), 'isometric');
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

export function frameCameraClippingToBounds(
    camera: CameraState,
    bounds: BoundingBox3,
): CameraState {
    const framedCamera = ensureCameraOutsideBounds(camera, bounds);
    const forward = normalizeVector3(subtractVector3(framedCamera.target, framedCamera.position));
    const corners = getBoundingBoxCorners(bounds);
    const boundsDiameter = getBoundsDiameter(bounds);
    let minDepth = Number.POSITIVE_INFINITY;
    let maxDepth = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
        const depth = dotVector3(subtractVector3(corner, framedCamera.position), forward);

        minDepth = Math.min(minDepth, depth);
        maxDepth = Math.max(maxDepth, depth);
    }

    if (maxDepth < minDepth) {
        return {
            ...framedCamera,
            near: 0.001,
            far: boundsDiameter * 2,
        };
    }

    const margin = boundsDiameter * 0.1;
    const near = Math.max(boundsDiameter * 0.01, minDepth - margin);
    const far = Math.max(boundsDiameter, maxDepth + margin, near + boundsDiameter * 0.01);

    return {
        ...framedCamera,
        near,
        far,
    };
}

function ensureCameraOutsideBounds(camera: CameraState, bounds: BoundingBox3): CameraState {
    const forward = normalizeVector3(subtractVector3(camera.target, camera.position));
    const center = scaleVector3(addVector3(bounds.min, bounds.max), 0.5);
    const boundsDiameter = getBoundsDiameter(bounds);
    const safeCenterDepth = boundsDiameter * 0.6;
    const centerDepth = dotVector3(subtractVector3(center, camera.position), forward);

    if (centerDepth >= safeCenterDepth) {
        return camera;
    }

    return {
        ...camera,
        position: addVector3(camera.position, scaleVector3(forward, centerDepth - safeCenterDepth)),
    };
}

function getBoundsDiameter(bounds: BoundingBox3): number {
    return Math.max(
        Math.hypot(
            bounds.max.x - bounds.min.x,
            bounds.max.y - bounds.min.y,
            bounds.max.z - bounds.min.z,
        ),
        1,
    );
}

export function cameraDepth01ToViewDepth(camera: CameraState, depth01: number): number {
    const clampedDepth = Math.min(Math.max(depth01, 0), 1);

    if (camera.projection === 'orthographic') {
        return camera.near + clampedDepth * (camera.far - camera.near);
    }

    const ndcDepth = clampedDepth * 2 - 1;

    return (
        (2 * camera.near * camera.far) /
        (camera.far + camera.near - ndcDepth * (camera.far - camera.near))
    );
}

export function canvasDepthToWorld(
    camera: CameraState,
    viewportSize: ViewportSize,
    point: ScreenPoint2,
    depth01: number,
): Vector3 {
    const basis = calculateCameraBasis(camera);
    const viewDepth = cameraDepth01ToViewDepth(camera, depth01);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const ndcX = (point.x / Math.max(viewportSize.width, 1)) * 2 - 1;
    const ndcY = 1 - (point.y / Math.max(viewportSize.height, 1)) * 2;
    const halfHeight =
        camera.projection === 'orthographic'
            ? camera.orthographicHeight / 2
            : viewDepth * Math.tan(camera.fovYRadians / 2);
    const halfWidth = halfHeight * aspect;

    return addVector3(
        camera.position,
        addVector3(
            scaleVector3(basis.forward, viewDepth),
            addVector3(
                scaleVector3(basis.right, ndcX * halfWidth),
                scaleVector3(basis.up, ndcY * halfHeight),
            ),
        ),
    );
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
        return createVector3(0, 1, 0);
    }

    if (view === 'back') {
        return createVector3(0, -1, 0);
    }

    if (view === 'right') {
        return createVector3(1, 0, 0);
    }

    if (view === 'left') {
        return createVector3(-1, 0, 0);
    }

    if (view === 'top') {
        return createVector3(0, 0, 1);
    }

    if (view === 'bottom') {
        return createVector3(0, 0, -1);
    }

    return normalizeVector3(createVector3(1, 1, 0.75));
}

function getStandardViewUp(view: StandardCameraView): Vector3 {
    if (view === 'top' || view === 'bottom') {
        return createVector3(0, 1, 0);
    }

    return createVector3(0, 0, 1);
}

function calculateCameraBasis(camera: CameraState): CameraBasis {
    const view = normalizeVector3(subtractVector3(camera.position, camera.target));
    const right = normalizeVector3(crossVector3(camera.up, view));
    const up = normalizeVector3(crossVector3(view, right));
    const forward = scaleVector3(view, -1);

    return { forward, right, up, view };
}
