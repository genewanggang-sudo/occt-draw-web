import { BBox3, Measurement, Scalar, Vec3, type Vector3 } from '@occt-draw/math';
import { calculateBoundingSphere, getBoundingBoxCorners } from './bounds';
import { calculateCameraBasis, calculateViewDepth } from './cameraGeometry';
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
        up: Vec3.of(0, 0, 1),
        viewDirection: Vec3.of(0, 1, 0),
    },
    bottom: {
        up: Vec3.of(0, -1, 0),
        viewDirection: Vec3.of(0, 0, -1),
    },
    front: {
        up: Vec3.of(0, 0, 1),
        viewDirection: Vec3.of(0, -1, 0),
    },
    left: {
        up: Vec3.of(0, 0, 1),
        viewDirection: Vec3.of(-1, 0, 0),
    },
    right: {
        up: Vec3.of(0, 0, 1),
        viewDirection: Vec3.of(1, 0, 0),
    },
    top: {
        up: Vec3.of(0, 1, 0),
        viewDirection: Vec3.of(0, 0, 1),
    },
};

const STANDARD_VIEW_DIRECTIONS: Readonly<Record<StandardCameraView, Vector3>> = {
    back: Vec3.of(0, 1, 0),
    bottom: Vec3.of(0, 0, -1),
    'bottom-back': Vec3.of(0, 1, -1),
    'bottom-front': Vec3.of(0, -1, -1),
    'bottom-left': Vec3.of(-1, 0, -1),
    'bottom-right': Vec3.of(1, 0, -1),
    front: Vec3.of(0, -1, 0),
    'front-left': Vec3.of(-1, -1, 0),
    'front-left-bottom': TRIMETRIC_BOTTOM_LEFT_FRONT_FRAME.viewDirection,
    'front-left-top': TRIMETRIC_TOP_LEFT_FRONT_FRAME.viewDirection,
    'front-right': Vec3.of(1, -1, 0),
    'front-right-bottom': TRIMETRIC_BOTTOM_RIGHT_FRONT_FRAME.viewDirection,
    'front-right-top': TRIMETRIC_TOP_RIGHT_FRONT_FRAME.viewDirection,
    home: TRIMETRIC_VIEW_DIRECTION,
    isometric: Vec3.of(Math.sqrt(1 / 3), -Math.sqrt(1 / 3), Math.sqrt(1 / 3)),
    left: Vec3.of(-1, 0, 0),
    'left-back': Vec3.of(-1, 1, 0),
    'left-back-bottom': TRIMETRIC_BOTTOM_LEFT_BACK_FRAME.viewDirection,
    'left-back-top': TRIMETRIC_TOP_LEFT_BACK_FRAME.viewDirection,
    right: Vec3.of(1, 0, 0),
    'right-back': Vec3.of(1, 1, 0),
    'right-back-bottom': TRIMETRIC_BOTTOM_RIGHT_BACK_FRAME.viewDirection,
    'right-back-top': TRIMETRIC_TOP_RIGHT_BACK_FRAME.viewDirection,
    top: Vec3.of(0, 0, 1),
    'top-back': Vec3.of(0, 1, 1),
    'top-front': Vec3.of(0, -1, 1),
    'top-left': Vec3.of(-1, 0, 1),
    'top-right': Vec3.of(1, 0, 1),
    trimetric: TRIMETRIC_VIEW_DIRECTION,
};

const ISOMETRIC_UP = Vec3.of(-Math.sqrt(1 / 6), Math.sqrt(1 / 6), 2 * Math.sqrt(1 / 6));
const WORLD_UP = Vec3.of(0, 0, 1);

export const DEFAULT_CAMERA_STATE: CameraState = {
    projection: 'orthographic',
    position: Vec3.scale(TRIMETRIC_VIEW_DIRECTION, 9.604686356149273),
    target: Vec3.of(0, 0, 0),
    up: TRIMETRIC_UP,
    orthographicHeight: 9,
    fovYRadians: Math.PI / 4,
    near: 0.1,
    far: 100,
};

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
            up: Vec3.of(ISOMETRIC_UP.x, ISOMETRIC_UP.y, ISOMETRIC_UP.z),
            viewDirection: Vec3.normalize(STANDARD_VIEW_DIRECTIONS.isometric),
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
        const relative = Vec3.subtract(corner, sphere.center);
        const x = Vec3.dot(relative, basis.right);
        const y = Vec3.dot(relative, basis.up);
        const z = Vec3.dot(relative, basis.view);

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
    const position = Vec3.add(sphere.center, Vec3.scale(basis.view, distance));

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
    const basis = calculateCameraBasis(framedCamera);
    const corners = getBoundingBoxCorners(bounds);
    const boundsDiameter = Math.max(
        Measurement.boundsDiameter3(BBox3.fromBoundsLike(bounds)).value,
        1,
    );
    let minDepth = Number.POSITIVE_INFINITY;
    let maxDepth = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
        const depth = calculateViewDepth(framedCamera, basis, corner);

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
    const basis = calculateCameraBasis(camera);
    const forward = basis.forward;
    const bbox = BBox3.fromBoundsLike(bounds);
    const center = bbox.center;
    const boundsDiameter = Math.max(Measurement.boundsDiameter3(bbox).value, 1);
    const safeCenterDepth = boundsDiameter * 0.6;
    const centerDepth = calculateViewDepth(camera, basis, center);

    if (centerDepth >= safeCenterDepth) {
        return camera;
    }

    return {
        ...camera,
        position: Vec3.add(camera.position, Vec3.scale(forward, centerDepth - safeCenterDepth)),
    };
}

export function cameraDepth01ToViewDepth(camera: CameraState, depth01: number): number {
    const clampedDepth = Scalar.clamp(depth01, 0, 1);

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

    return Vec3.add(
        camera.position,
        Vec3.add(
            Vec3.scale(basis.forward, viewDepth),
            Vec3.add(
                Vec3.scale(basis.right, ndcX * halfWidth),
                Vec3.scale(basis.up, ndcY * halfHeight),
            ),
        ),
    );
}

function createCameraFromFrame(bounds: BoundingBox3, frame: StandardCameraFrame): CameraState {
    const sphere = calculateBoundingSphere(bounds);
    const distance = sphere.radius * 3.5;

    return {
        projection: 'orthographic',
        position: Vec3.add(sphere.center, Vec3.scale(frame.viewDirection, distance)),
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
        up: Vec3.of(frame.up.x, frame.up.y, frame.up.z),
        viewDirection: Vec3.of(frame.viewDirection.x, frame.viewDirection.y, frame.viewDirection.z),
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
        up: Vec3.of(-sinHorizontal * cosVertical, cosHorizontal * cosVertical, sinVertical),
        viewDirection: Vec3.of(
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
    const view = Vec3.normalize(viewDirection);
    const projectedUp = Vec3.subtract(preferredUp, Vec3.scale(view, Vec3.dot(preferredUp, view)));
    const up = Vec3.normalize(projectedUp);
    const right = Vec3.cross(up, view).normalize();

    return {
        up: Vec3.cross(view, right).normalize(),
        viewDirection: view,
    };
}
