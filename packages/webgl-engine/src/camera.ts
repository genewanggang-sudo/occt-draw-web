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
    | 'bottom-back'
    | 'bottom-front'
    | 'bottom-left'
    | 'bottom-right'
    | 'front'
    | 'front-left'
    | 'front-left-bottom'
    | 'front-left-top'
    | 'front-right'
    | 'front-right-bottom'
    | 'front-right-top'
    | 'home'
    | 'isometric'
    | 'left'
    | 'left-back'
    | 'left-back-bottom'
    | 'left-back-top'
    | 'right'
    | 'right-back'
    | 'right-back-bottom'
    | 'right-back-top'
    | 'top'
    | 'top-back'
    | 'top-front'
    | 'top-left'
    | 'top-right'
    | 'trimetric';

export interface StandardCameraFrame {
    readonly up: Vector3;
    readonly viewDirection: Vector3;
}

const TRIMETRIC_TOP_RIGHT_FRONT_FRAME = createTrimetricCornerFrame(0, true);
const TRIMETRIC_TOP_RIGHT_BACK_FRAME = createTrimetricCornerFrame(1, true);
const TRIMETRIC_TOP_LEFT_BACK_FRAME = createTrimetricCornerFrame(2, true);
const TRIMETRIC_TOP_LEFT_FRONT_FRAME = createTrimetricCornerFrame(3, true);
const TRIMETRIC_BOTTOM_RIGHT_FRONT_FRAME = createTrimetricCornerFrame(0, false);
const TRIMETRIC_BOTTOM_RIGHT_BACK_FRAME = createTrimetricCornerFrame(1, false);
const TRIMETRIC_BOTTOM_LEFT_BACK_FRAME = createTrimetricCornerFrame(2, false);
const TRIMETRIC_BOTTOM_LEFT_FRONT_FRAME = createTrimetricCornerFrame(3, false);
const TRIMETRIC_VIEW_DIRECTION = TRIMETRIC_TOP_RIGHT_FRONT_FRAME.viewDirection;
const TRIMETRIC_UP = TRIMETRIC_TOP_RIGHT_FRONT_FRAME.up;
const STANDARD_CORNER_FRAMES: Readonly<Partial<Record<StandardCameraView, StandardCameraFrame>>> = {
    'front-left-bottom': TRIMETRIC_BOTTOM_LEFT_FRONT_FRAME,
    'front-left-top': TRIMETRIC_TOP_LEFT_FRONT_FRAME,
    'front-right-bottom': TRIMETRIC_BOTTOM_RIGHT_FRONT_FRAME,
    'front-right-top': TRIMETRIC_TOP_RIGHT_FRONT_FRAME,
    'left-back-bottom': TRIMETRIC_BOTTOM_LEFT_BACK_FRAME,
    'left-back-top': TRIMETRIC_TOP_LEFT_BACK_FRAME,
    'right-back-bottom': TRIMETRIC_BOTTOM_RIGHT_BACK_FRAME,
    'right-back-top': TRIMETRIC_TOP_RIGHT_BACK_FRAME,
};
const STANDARD_FACE_FRAMES: Readonly<Partial<Record<StandardCameraView, StandardCameraFrame>>> = {
    back: {
        up: createVector3(0, 0, 1),
        viewDirection: createVector3(0, 1, 0),
    },
    bottom: {
        up: createVector3(0, -1, 0),
        viewDirection: createVector3(0, 0, -1),
    },
    front: {
        up: createVector3(0, 0, 1),
        viewDirection: createVector3(0, -1, 0),
    },
    left: {
        up: createVector3(0, 0, 1),
        viewDirection: createVector3(-1, 0, 0),
    },
    right: {
        up: createVector3(0, 0, 1),
        viewDirection: createVector3(1, 0, 0),
    },
    top: {
        up: createVector3(0, 1, 0),
        viewDirection: createVector3(0, 0, 1),
    },
};

const STANDARD_VIEW_DIRECTIONS: Readonly<Record<StandardCameraView, Vector3>> = {
    back: createVector3(0, 1, 0),
    bottom: createVector3(0, 0, -1),
    'bottom-back': createVector3(0, 1, -1),
    'bottom-front': createVector3(0, -1, -1),
    'bottom-left': createVector3(-1, 0, -1),
    'bottom-right': createVector3(1, 0, -1),
    front: createVector3(0, -1, 0),
    'front-left': createVector3(-1, -1, 0),
    'front-left-bottom': TRIMETRIC_BOTTOM_LEFT_FRONT_FRAME.viewDirection,
    'front-left-top': TRIMETRIC_TOP_LEFT_FRONT_FRAME.viewDirection,
    'front-right': createVector3(1, -1, 0),
    'front-right-bottom': TRIMETRIC_BOTTOM_RIGHT_FRONT_FRAME.viewDirection,
    'front-right-top': TRIMETRIC_TOP_RIGHT_FRONT_FRAME.viewDirection,
    home: TRIMETRIC_VIEW_DIRECTION,
    isometric: createVector3(Math.sqrt(1 / 3), -Math.sqrt(1 / 3), Math.sqrt(1 / 3)),
    left: createVector3(-1, 0, 0),
    'left-back': createVector3(-1, 1, 0),
    'left-back-bottom': TRIMETRIC_BOTTOM_LEFT_BACK_FRAME.viewDirection,
    'left-back-top': TRIMETRIC_TOP_LEFT_BACK_FRAME.viewDirection,
    right: createVector3(1, 0, 0),
    'right-back': createVector3(1, 1, 0),
    'right-back-bottom': TRIMETRIC_BOTTOM_RIGHT_BACK_FRAME.viewDirection,
    'right-back-top': TRIMETRIC_TOP_RIGHT_BACK_FRAME.viewDirection,
    top: createVector3(0, 0, 1),
    'top-back': createVector3(0, 1, 1),
    'top-front': createVector3(0, -1, 1),
    'top-left': createVector3(-1, 0, 1),
    'top-right': createVector3(1, 0, 1),
    trimetric: TRIMETRIC_VIEW_DIRECTION,
};

const ISOMETRIC_UP = createVector3(-Math.sqrt(1 / 6), Math.sqrt(1 / 6), 2 * Math.sqrt(1 / 6));
const WORLD_UP = createVector3(0, 0, 1);
const TOP_BOTTOM_UP = createVector3(0, 1, 0);

export const DEFAULT_CAMERA_STATE: CameraState = {
    projection: 'orthographic',
    position: scaleVector3(TRIMETRIC_VIEW_DIRECTION, 9.604686356149273),
    target: createVector3(0, 0, 0),
    up: TRIMETRIC_UP,
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
    return createStandardCameraState(calculateRenderSceneNavigationBoundingBox(scene), 'trimetric');
}

export function createStandardCameraState(
    bounds: BoundingBox3,
    view: StandardCameraView,
    viewportSize?: ViewportSize,
): CameraState {
    const baseCamera = createCameraStateFromFrame(bounds, getStandardCameraFrame(view));

    if (!viewportSize) {
        return baseCamera;
    }

    return fitCameraToBounds(baseCamera, bounds, viewportSize);
}

export function createCameraStateFromFrame(
    bounds: BoundingBox3,
    frame: StandardCameraFrame,
    viewportSize?: ViewportSize,
): CameraState {
    const baseCamera = createCameraFromFrame(bounds, frame);

    if (!viewportSize) {
        return baseCamera;
    }

    return fitCameraToBounds(baseCamera, bounds, viewportSize);
}

export function getStandardCameraFrame(view: StandardCameraView): StandardCameraFrame {
    const faceFrame = STANDARD_FACE_FRAMES[view];

    if (faceFrame) {
        return cloneStandardCameraFrame(faceFrame);
    }

    const cornerFrame = STANDARD_CORNER_FRAMES[view];

    if (cornerFrame) {
        return cloneStandardCameraFrame(cornerFrame);
    }

    if (view === 'trimetric' || view === 'home') {
        return cloneStandardCameraFrame({
            up: TRIMETRIC_UP,
            viewDirection: TRIMETRIC_VIEW_DIRECTION,
        });
    }

    if (view === 'isometric') {
        return {
            up: createVector3(ISOMETRIC_UP.x, ISOMETRIC_UP.y, ISOMETRIC_UP.z),
            viewDirection: normalizeVector3(STANDARD_VIEW_DIRECTIONS.isometric),
        };
    }

    const direction = STANDARD_VIEW_DIRECTIONS[view];

    return createStandardCameraFrame(direction, WORLD_UP);
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

function createCameraFromFrame(bounds: BoundingBox3, frame: StandardCameraFrame): CameraState {
    const sphere = calculateBoundingSphere(bounds);
    const distance = sphere.radius * 3.5;

    return {
        projection: 'orthographic',
        position: addVector3(sphere.center, scaleVector3(frame.viewDirection, distance)),
        target: sphere.center,
        up: frame.up,
        orthographicHeight: sphere.radius * 2.4,
        fovYRadians: Math.PI / 4,
        near: 0.1,
        far: sphere.radius * 12,
    };
}

function cloneStandardCameraFrame(frame: StandardCameraFrame): StandardCameraFrame {
    return {
        up: createVector3(frame.up.x, frame.up.y, frame.up.z),
        viewDirection: createVector3(
            frame.viewDirection.x,
            frame.viewDirection.y,
            frame.viewDirection.z,
        ),
    };
}

function createTrimetricCornerFrame(turnIndex: number, isTop: boolean): StandardCameraFrame {
    const horizontalAngle = turnIndex * (Math.PI / 2) + Math.PI / 6;
    const verticalAngle = isTop ? Math.PI / 3 : (Math.PI * 2) / 3;
    const sinHorizontal = Math.sin(horizontalAngle);
    const cosHorizontal = Math.cos(horizontalAngle);
    const sinVertical = Math.sin(verticalAngle);
    const cosVertical = Math.cos(verticalAngle);

    return {
        up: createVector3(-sinHorizontal * cosVertical, cosHorizontal * cosVertical, sinVertical),
        viewDirection: createVector3(
            sinHorizontal * sinVertical,
            -cosHorizontal * sinVertical,
            cosVertical,
        ),
    };
}

function createStandardCameraFrame(
    viewDirection: Vector3,
    preferredUp: Vector3,
): StandardCameraFrame {
    const view = normalizeVector3(viewDirection);
    const projectedUp = subtractVector3(
        preferredUp,
        scaleVector3(view, dotVector3(preferredUp, view)),
    );
    const up =
        Math.hypot(projectedUp.x, projectedUp.y, projectedUp.z) > 1e-6
            ? normalizeVector3(projectedUp)
            : TOP_BOTTOM_UP;
    const right = normalizeVector3(crossVector3(up, view));

    return {
        up: normalizeVector3(crossVector3(view, right)),
        viewDirection: view,
    };
}

function calculateCameraBasis(camera: CameraState): CameraBasis {
    const view = normalizeVector3(subtractVector3(camera.position, camera.target));
    const right = normalizeVector3(crossVector3(camera.up, view));
    const up = normalizeVector3(crossVector3(view, right));
    const forward = scaleVector3(view, -1);

    return { forward, right, up, view };
}
