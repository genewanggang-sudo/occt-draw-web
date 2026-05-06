import { clampNumber, Measurement, Scalar, Vec3, type Vector3 } from '@occt-draw/math';
import {
    calculateCameraBasis,
    screenPointToWorldOnViewPlane,
    type BoundingSphere,
    type CameraState,
    type ViewCubeArrowCommand,
    type ViewportSize,
} from '@occt-draw/webgl-engine';

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

export type ViewCubeRotationStep = 'coarse' | 'default' | 'fine';

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
const VIEW_CUBE_ROTATION_AMOUNTS: Readonly<Record<ViewCubeRotationStep, number>> = {
    coarse: Math.PI / 2,
    default: Math.PI / 6,
    fine: Math.PI / 18,
};
const ZOOM_SENSITIVITY = 0.001;

export function createFramedStandardCamera(
    camera: CameraState,
    bounds: BoundingSphere,
): CameraState {
    const direction = Vec3.normalize(Vec3.subtract(camera.position, camera.target));
    const distance = Math.max(bounds.radius * 3.5, 1);

    return {
        ...camera,
        position: Vec3.add(bounds.center, Vec3.scale(direction, distance)),
        target: bounds.center,
    };
}

export function interpolateCameraState(
    startCamera: CameraState,
    endCamera: CameraState,
    progress: number,
): CameraState {
    const t = clampNumber(progress, 0, 1);
    const startTarget = startCamera.target;
    const endTarget = endCamera.target;
    const target = Vec3.of(
        Scalar.lerp(startTarget.x, endTarget.x, t),
        Scalar.lerp(startTarget.y, endTarget.y, t),
        Scalar.lerp(startTarget.z, endTarget.z, t),
    );
    const startView = Vec3.normalize(Vec3.subtract(startCamera.position, startCamera.target));
    const endView = Vec3.normalize(Vec3.subtract(endCamera.position, endCamera.target));
    const view = Vec3.normalize(
        Vec3.of(
            Scalar.lerp(startView.x, endView.x, t),
            Scalar.lerp(startView.y, endView.y, t),
            Scalar.lerp(startView.z, endView.z, t),
        ),
    );
    const startDistance = Measurement.distance3(startCamera.position, startCamera.target).value;
    const endDistance = Measurement.distance3(endCamera.position, endCamera.target).value;
    const distance = Scalar.lerp(startDistance, endDistance, t);
    const rawUp = Vec3.normalize(
        Vec3.of(
            Scalar.lerp(startCamera.up.x, endCamera.up.x, t),
            Scalar.lerp(startCamera.up.y, endCamera.up.y, t),
            Scalar.lerp(startCamera.up.z, endCamera.up.z, t),
        ),
    );
    const right = Vec3.normalize(Vec3.cross(rawUp, view));
    const up = Vec3.normalize(Vec3.cross(view, right));

    return {
        ...endCamera,
        far: Scalar.lerp(startCamera.far, endCamera.far, t),
        fovYRadians: Scalar.lerp(startCamera.fovYRadians, endCamera.fovYRadians, t),
        near: Scalar.lerp(startCamera.near, endCamera.near, t),
        orthographicHeight: Scalar.lerp(
            startCamera.orthographicHeight,
            endCamera.orthographicHeight,
            t,
        ),
        position: Vec3.add(target, Vec3.scale(view, distance)),
        target,
        up,
    };
}

export function rotateCameraByScreenDelta(
    camera: CameraState,
    pivot: Vector3,
    deltaX: number,
    deltaY: number,
): CameraState {
    return rotateCameraByScreenAxes(camera, pivot, deltaX, deltaY);
}

export function rotateCameraByViewCubeArrow(
    camera: CameraState,
    pivot: Vector3,
    command: ViewCubeArrowCommand,
    step: ViewCubeRotationStep,
): CameraState {
    const basis = calculateCameraBasis(camera);
    const amount = VIEW_CUBE_ROTATION_AMOUNTS[step];

    if (command === 'arrow-left') {
        return rotateCameraAroundAxis(camera, pivot, basis.up, amount);
    }

    if (command === 'arrow-right') {
        return rotateCameraAroundAxis(camera, pivot, basis.up, -amount);
    }

    if (command === 'arrow-up') {
        return rotateCameraAroundAxis(camera, pivot, basis.right, amount);
    }

    if (command === 'arrow-down') {
        return rotateCameraAroundAxis(camera, pivot, basis.right, -amount);
    }

    if (command === 'arrow-cw') {
        return rotateCameraAroundAxis(camera, pivot, basis.forward, -amount);
    }

    return rotateCameraAroundAxis(camera, pivot, basis.forward, amount);
}

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
                    ? screenPointToWorldOnViewPlane(
                          pointer.point,
                          dragCamera,
                          state.viewportSize,
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

    const currentWorldPoint = screenPointToWorldOnViewPlane(
        pointer.point,
        drag.camera,
        drag.viewportSize,
        drag.orbitPivot,
    );
    const translation = Vec3.subtract(drag.anchorWorldPoint, currentWorldPoint);
    const nextCamera = translateCamera(drag.camera, translation);

    return {
        ...state,
        camera: nextCamera,
        drag: {
            ...drag,
            camera: nextCamera,
            orbitPivot: Vec3.add(drag.orbitPivot, translation),
            previousPoint: pointer.point,
        },
        orbitPivot: Vec3.add(state.orbitPivot, translation),
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
    const before = screenPointToWorldOnViewPlane(
        wheel.point,
        state.camera,
        state.viewportSize,
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
    const after = screenPointToWorldOnViewPlane(
        wheel.point,
        zoomedCamera,
        state.viewportSize,
        zoomAnchor,
    );
    const translation = Vec3.subtract(before, after);

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
    const basis = calculateCameraBasis(camera);
    const positionOffset = Vec3.subtract(camera.position, pivot);
    const targetOffset = Vec3.subtract(camera.target, pivot);
    const pitchAngle = -deltaY * ROTATION_SENSITIVITY;
    const yawAngle = -deltaX * ROTATION_SENSITIVITY;
    const pitchedPositionOffset = Vec3.rotateAroundAxis(positionOffset, basis.right, pitchAngle);
    const pitchedTargetOffset = Vec3.rotateAroundAxis(targetOffset, basis.right, pitchAngle);
    const pitchedUp = Vec3.rotateAroundAxis(camera.up, basis.right, pitchAngle);
    const rotatedPositionOffset = Vec3.rotateAroundAxis(pitchedPositionOffset, basis.up, yawAngle);
    const rotatedTargetOffset = Vec3.rotateAroundAxis(pitchedTargetOffset, basis.up, yawAngle);
    const rotatedRawUp = Vec3.rotateAroundAxis(pitchedUp, basis.up, yawAngle);
    const forward = Vec3.normalize(Vec3.subtract(rotatedTargetOffset, rotatedPositionOffset));
    const right = Vec3.normalize(Vec3.cross(forward, rotatedRawUp));
    const up = Vec3.normalize(Vec3.cross(right, forward));

    return {
        ...camera,
        position: Vec3.add(pivot, rotatedPositionOffset),
        target: Vec3.add(pivot, rotatedTargetOffset),
        up,
    };
}

function rotateCameraAroundAxis(
    camera: CameraState,
    pivot: Vector3,
    axis: Vector3,
    angle: number,
): CameraState {
    const positionOffset = Vec3.subtract(camera.position, pivot);
    const targetOffset = Vec3.subtract(camera.target, pivot);
    const rotatedPositionOffset = Vec3.rotateAroundAxis(positionOffset, axis, angle);
    const rotatedTargetOffset = Vec3.rotateAroundAxis(targetOffset, axis, angle);
    const rotatedRawUp = Vec3.rotateAroundAxis(camera.up, axis, angle);
    const forward = Vec3.normalize(Vec3.subtract(rotatedTargetOffset, rotatedPositionOffset));
    const right = Vec3.normalize(Vec3.cross(forward, rotatedRawUp));
    const up = Vec3.normalize(Vec3.cross(right, forward));

    return {
        ...camera,
        position: Vec3.add(pivot, rotatedPositionOffset),
        target: Vec3.add(pivot, rotatedTargetOffset),
        up,
    };
}

function translateCamera(camera: CameraState, translation: Vector3): CameraState {
    return {
        ...camera,
        position: Vec3.add(camera.position, translation),
        target: Vec3.add(camera.target, translation),
    };
}
