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
    readonly pointerId: number;
    readonly point: ScreenPoint;
}

export interface ViewNavigationWheel {
    readonly deltaY: number;
    readonly point: ScreenPoint;
}

export interface ViewNavigationState {
    readonly camera: CameraState;
    readonly drag: null | ViewNavigationDragState;
    readonly pivot: Vector3;
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
    readonly pointerId: number;
    readonly pivot: Vector3;
    readonly rotateFrame: null | ViewNavigationRotateFrame;
    readonly previousPoint: ScreenPoint;
    readonly startPoint: ScreenPoint;
    readonly viewportSize: ViewportSize;
}

type ViewNavigationMode = 'pan' | 'rotate';

interface ViewNavigationRotateFrame {
    readonly camera: CameraState;
    readonly pivot: Vector3;
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
        pivot: bounds.center,
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

export function beginViewNavigation(
    state: ViewNavigationState,
    pointer: ViewNavigationPointer,
): ViewNavigationState {
    const mode = getNavigationMode(pointer);

    if (!mode) {
        return state;
    }

    const dragCamera = state.camera;

    return {
        ...state,
        drag: {
            anchorWorldPoint:
                mode === 'pan'
                    ? screenToWorldOnViewPlane(
                          dragCamera,
                          state.viewportSize,
                          pointer.point,
                          state.pivot,
                      )
                    : null,
            camera: dragCamera,
            mode,
            pointerId: pointer.pointerId,
            pivot: state.pivot,
            rotateFrame:
                mode === 'rotate'
                    ? {
                          camera: dragCamera,
                          pivot: state.pivot,
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
            drag.pivot,
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
        drag.pivot,
    );
    const translation = subtractVector3(drag.anchorWorldPoint, currentWorldPoint);
    const nextCamera = translateCamera(drag.camera, translation);

    return {
        ...state,
        camera: nextCamera,
        drag: {
            ...drag,
            camera: nextCamera,
            pivot: addVector3(drag.pivot, translation),
            previousPoint: pointer.point,
        },
        pivot: addVector3(state.pivot, translation),
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
    const before = screenToWorldOnViewPlane(
        state.camera,
        state.viewportSize,
        wheel.point,
        state.pivot,
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
        state.pivot,
    );
    const translation = subtractVector3(before, after);

    return {
        ...state,
        camera: translateCamera(zoomedCamera, translation),
        pivot: addVector3(state.pivot, translation),
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
    const offset = subtractVector3(camera.position, pivot);
    const pitchAngle = -deltaY * ROTATION_SENSITIVITY;
    const yawAngle = -deltaX * ROTATION_SENSITIVITY;
    const pitchedOffset = rotateVectorAroundAxis(offset, basis.right, pitchAngle);
    const pitchedUp = rotateVectorAroundAxis(camera.up, basis.right, pitchAngle);
    const rotatedOffset = rotateVectorAroundAxis(pitchedOffset, basis.up, yawAngle);
    const rotatedRawUp = rotateVectorAroundAxis(pitchedUp, basis.up, yawAngle);
    const forward = normalizeVector3(scaleVector3(rotatedOffset, -1));
    const right = normalizeVector3(crossVector3(forward, rotatedRawUp));
    const up = normalizeVector3(crossVector3(right, forward));

    return {
        ...camera,
        position: addVector3(pivot, rotatedOffset),
        target: pivot,
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
