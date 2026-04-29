import {
    addVector3,
    clampNumber,
    crossVector3,
    normalizeVector3,
    rotateVectorAroundAxis,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { BoundingSphere, CameraState, ViewportSize } from '@occt-draw/renderer';

export interface ScreenPoint {
    readonly x: number;
    readonly y: number;
}

export interface ViewNavigationPointer {
    readonly button: number;
    readonly ctrlKey: boolean;
    readonly orbitPivot?: Vector3;
    readonly pointerId: number;
    readonly point: ScreenPoint;
}

export interface ViewNavigationWheel {
    readonly deltaY: number;
    readonly zoomAnchor?: Vector3;
    readonly point: ScreenPoint;
}

export interface ViewNavigationState {
    readonly camera: CameraState;
    readonly drag: null | ViewNavigationDragState;
    readonly orbitPivot: Vector3;
    readonly sceneCenter: Vector3;
    readonly sceneRadius: number;
    readonly viewportSize: ViewportSize;
}

interface CameraBasis {
    readonly forward: Vector3;
    readonly right: Vector3;
    readonly up: Vector3;
}

interface ViewNavigationDragState {
    readonly anchorWorldPoint: null | Vector3;
    readonly camera: CameraState;
    readonly mode: ViewNavigationMode;
    readonly orbitPivot: Vector3;
    readonly pointerId: number;
    readonly rotateFrame: null | ViewNavigationRotateFrame;
    readonly previousPoint: ScreenPoint;
    readonly startPoint: ScreenPoint;
    readonly viewportSize: ViewportSize;
}

type ViewNavigationMode = 'pan' | 'rotate';

interface ViewNavigationRotateFrame {
    readonly camera: CameraState;
    readonly orbitPivot: Vector3;
}

const ROTATION_SENSITIVITY = 0.0065;
const ZOOM_SENSITIVITY = 0.001;

export function createViewNavigationState(
    camera: CameraState,
    bounds: BoundingSphere,
    viewportSize: ViewportSize,
): ViewNavigationState {
    return {
        camera,
        drag: null,
        orbitPivot: bounds.center,
        sceneCenter: bounds.center,
        sceneRadius: bounds.radius,
        viewportSize,
    };
}

export function updateViewNavigationViewport(
    state: ViewNavigationState,
    viewportSize: ViewportSize,
): ViewNavigationState {
    return {
        ...state,
        viewportSize,
    };
}

export function updateViewNavigationCamera(
    state: ViewNavigationState,
    camera: CameraState,
    bounds: BoundingSphere,
): ViewNavigationState {
    return {
        ...state,
        camera,
        drag: null,
        orbitPivot: bounds.center,
        sceneCenter: bounds.center,
        sceneRadius: bounds.radius,
    };
}

export function beginViewNavigation(
    state: ViewNavigationState,
    pointer: ViewNavigationPointer,
): ViewNavigationState {
    const mode = getNavigationMode(pointer);

    if (!mode) {
        return state;
    }

    const dragCamera = state.camera;
    const orbitPivot = pointer.orbitPivot ?? state.orbitPivot;

    return {
        ...state,
        orbitPivot,
        drag: {
            anchorWorldPoint:
                mode === 'pan'
                    ? screenToWorldOnViewPlane(
                          dragCamera,
                          state.viewportSize,
                          pointer.point,
                          orbitPivot,
                      )
                    : null,
            camera: dragCamera,
            mode,
            orbitPivot,
            pointerId: pointer.pointerId,
            rotateFrame:
                mode === 'rotate'
                    ? {
                          camera: dragCamera,
                          orbitPivot,
                      }
                    : null,
            previousPoint: pointer.point,
            startPoint: pointer.point,
            viewportSize: state.viewportSize,
        },
    };
}

export function updateViewNavigation(
    state: ViewNavigationState,
    pointer: ViewNavigationPointer,
): ViewNavigationState {
    const drag = state.drag;

    if (drag?.pointerId !== pointer.pointerId) {
        return state;
    }

    if (drag.mode === 'rotate' && drag.rotateFrame) {
        const nextCamera = rotateCameraByScreenAxes(
            drag.camera,
            drag.orbitPivot,
            pointer.point.x - drag.previousPoint.x,
            pointer.point.y - drag.previousPoint.y,
        );

        return {
            ...state,
            camera: nextCamera,
            drag: {
                ...drag,
                camera: nextCamera,
                previousPoint: pointer.point,
                startPoint: pointer.point,
            },
        };
    }

    if (!drag.anchorWorldPoint) {
        return state;
    }

    const currentWorldPoint = screenToWorldOnViewPlane(
        drag.camera,
        drag.viewportSize,
        pointer.point,
        drag.orbitPivot,
    );
    const translation = subtractVector3(drag.anchorWorldPoint, currentWorldPoint);
    const nextCamera = translateCamera(drag.camera, translation);

    return {
        ...state,
        camera: nextCamera,
        drag: {
            ...drag,
            camera: nextCamera,
            orbitPivot: addVector3(drag.orbitPivot, translation),
            previousPoint: pointer.point,
        },
        orbitPivot: addVector3(state.orbitPivot, translation),
    };
}

export function endViewNavigation(
    state: ViewNavigationState,
    pointerId: number,
): ViewNavigationState {
    if (state.drag?.pointerId !== pointerId) {
        return state;
    }

    return {
        ...state,
        drag: null,
    };
}

export function zoomViewNavigation(
    state: ViewNavigationState,
    wheel: ViewNavigationWheel,
): ViewNavigationState {
    const zoomAnchor = wheel.zoomAnchor ?? state.orbitPivot;
    const before = screenToWorldOnViewPlane(
        state.camera,
        state.viewportSize,
        wheel.point,
        zoomAnchor,
    );
    const minHeight = Math.max(state.sceneRadius / 1000, 0.001);
    const maxHeight = Math.max(state.sceneRadius * 80, 10);
    const nextHeight = clampNumber(
        state.camera.orthographicHeight * Math.exp(wheel.deltaY * ZOOM_SENSITIVITY),
        minHeight,
        maxHeight,
    );
    const zoomedCamera = {
        ...state.camera,
        orthographicHeight: nextHeight,
    };
    const after = screenToWorldOnViewPlane(
        zoomedCamera,
        state.viewportSize,
        wheel.point,
        zoomAnchor,
    );
    const translation = subtractVector3(before, after);

    return {
        ...state,
        camera: translateCamera(zoomedCamera, translation),
    };
}

function getNavigationMode(pointer: ViewNavigationPointer): null | ViewNavigationMode {
    if (pointer.button === 1 || (pointer.button === 2 && pointer.ctrlKey)) {
        return 'pan';
    }

    if (pointer.button === 2) {
        return 'rotate';
    }

    return null;
}

function rotateCameraByScreenAxes(
    camera: CameraState,
    pivot: Vector3,
    deltaX: number,
    deltaY: number,
): CameraState {
    const basis = getCameraBasis(camera);
    const positionOffset = subtractVector3(camera.position, pivot);
    const targetOffset = subtractVector3(camera.target, pivot);
    const pitchAngle = -deltaY * ROTATION_SENSITIVITY;
    const yawAngle = -deltaX * ROTATION_SENSITIVITY;
    const pitchedPositionOffset = rotateVectorAroundAxis(positionOffset, basis.right, pitchAngle);
    const pitchedTargetOffset = rotateVectorAroundAxis(targetOffset, basis.right, pitchAngle);
    const pitchedUp = rotateVectorAroundAxis(camera.up, basis.right, pitchAngle);
    const rotatedPositionOffset = rotateVectorAroundAxis(pitchedPositionOffset, basis.up, yawAngle);
    const rotatedTargetOffset = rotateVectorAroundAxis(pitchedTargetOffset, basis.up, yawAngle);
    const rotatedRawUp = rotateVectorAroundAxis(pitchedUp, basis.up, yawAngle);
    const forward = normalizeVector3(subtractVector3(rotatedTargetOffset, rotatedPositionOffset));
    const right = normalizeVector3(crossVector3(forward, rotatedRawUp));
    const up = normalizeVector3(crossVector3(right, forward));

    return {
        ...camera,
        position: addVector3(pivot, rotatedPositionOffset),
        target: addVector3(pivot, rotatedTargetOffset),
        up,
    };
}

function translateCamera(camera: CameraState, translation: Vector3): CameraState {
    return {
        ...camera,
        position: addVector3(camera.position, translation),
        target: addVector3(camera.target, translation),
    };
}

function screenToWorldOnViewPlane(
    camera: CameraState,
    viewportSize: ViewportSize,
    point: ScreenPoint,
    planeCenter: Vector3,
): Vector3 {
    const basis = getCameraBasis(camera);
    const height =
        camera.projection === 'orthographic'
            ? camera.orthographicHeight
            : getPerspectiveViewPlaneHeight(camera);
    const width = height * (viewportSize.width / viewportSize.height);
    const x = (point.x / viewportSize.width - 0.5) * width;
    const y = (0.5 - point.y / viewportSize.height) * height;

    return addVector3(
        planeCenter,
        addVector3(scaleVector3(basis.right, x), scaleVector3(basis.up, y)),
    );
}

function getPerspectiveViewPlaneHeight(camera: CameraState): number {
    const distance = Math.max(
        0.001,
        Math.hypot(
            camera.position.x - camera.target.x,
            camera.position.y - camera.target.y,
            camera.position.z - camera.target.z,
        ),
    );

    return 2 * distance * Math.tan(camera.fovYRadians / 2);
}

function getCameraBasis(camera: CameraState): CameraBasis {
    const forward = normalizeVector3(subtractVector3(camera.target, camera.position));
    const right = normalizeVector3(crossVector3(forward, camera.up));
    const up = normalizeVector3(crossVector3(right, forward));

    return {
        forward,
        right,
        up,
    };
}
