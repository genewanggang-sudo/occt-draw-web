import { BBox3, Ray3, Vec3, type Vector3 } from '@occt-draw/math';
import type { BoundingBox3, CameraState, ScreenPoint2, ScreenRect, ViewportSize } from './types';

export interface CameraBasis {
    readonly forward: Vector3;
    readonly right: Vector3;
    readonly up: Vector3;
    readonly view: Vector3;
}

export function calculateCameraBasis(camera: CameraState): CameraBasis {
    const view = Vec3.subtract(camera.position, camera.target).normalizeOr(Vec3.of(0, 0, 1));
    const fallbackUp = Math.abs(view.z) < 0.9 ? Vec3.of(0, 0, 1) : Vec3.of(0, 1, 0);
    const projectedUp = Vec3.from(camera.up).subtract(view.scale(Vec3.dot(camera.up, view)));
    const upSeed = projectedUp.normalizeOr(fallbackUp);
    const right = upSeed.cross(view).normalizeOr(Vec3.of(1, 0, 0));
    const up = view.cross(right).normalizeOr(upSeed);
    const forward = Vec3.scale(view, -1);

    return { forward, right, up, view };
}

export function getCameraViewHeight(camera: CameraState): number {
    if (camera.projection === 'orthographic') {
        return camera.orthographicHeight;
    }

    const distance = Math.max(0.001, Vec3.distance(camera.position, camera.target));

    return 2 * distance * Math.tan(camera.fovYRadians / 2);
}

export function calculateViewDepth(
    camera: CameraState,
    basis: CameraBasis,
    point: Vector3,
): number {
    return Vec3.dot(Vec3.subtract(point, camera.position), basis.forward);
}

export function projectWorldToScreen(
    point: Vector3,
    camera: CameraState,
    viewportSize: ViewportSize,
    basis = calculateCameraBasis(camera),
): ScreenPoint2 {
    const relative = Vec3.subtract(point, camera.target);
    const aspect = Math.max(viewportSize.width / viewportSize.height, 0.001);
    const halfHeight = getCameraViewHeight(camera) / 2;
    const halfWidth = halfHeight * aspect;
    const projectedX = Vec3.dot(relative, basis.right);
    const projectedY = Vec3.dot(relative, basis.up);

    return {
        x: ((projectedX / halfWidth + 1) / 2) * viewportSize.width,
        y: ((1 - projectedY / halfHeight) / 2) * viewportSize.height,
    };
}

export function screenPointToWorldRay(
    point: ScreenPoint2,
    camera: CameraState,
    viewportSize: ViewportSize,
    basis = calculateCameraBasis(camera),
): Ray3 {
    const height = getCameraViewHeight(camera);
    const width = height * (viewportSize.width / viewportSize.height);
    const x = (point.x / viewportSize.width - 0.5) * width;
    const y = (0.5 - point.y / viewportSize.height) * height;
    const viewPlanePoint = Vec3.add(
        camera.target,
        Vec3.add(Vec3.scale(basis.right, x), Vec3.scale(basis.up, y)),
    );

    if (camera.projection === 'perspective') {
        return new Ray3(camera.position, Vec3.subtract(viewPlanePoint, camera.position));
    }

    return new Ray3(
        Vec3.subtract(
            viewPlanePoint,
            Vec3.scale(basis.forward, calculateViewDepth(camera, basis, camera.target)),
        ),
        basis.forward,
    );
}

export function screenPointToWorldOnViewPlane(
    point: ScreenPoint2,
    camera: CameraState,
    viewportSize: ViewportSize,
    planeCenter: Vector3,
    basis = calculateCameraBasis(camera),
): Vector3 {
    const height = getCameraViewHeight(camera);
    const width = height * (viewportSize.width / viewportSize.height);
    const x = (point.x / viewportSize.width - 0.5) * width;
    const y = (0.5 - point.y / viewportSize.height) * height;

    return Vec3.add(planeCenter, Vec3.add(Vec3.scale(basis.right, x), Vec3.scale(basis.up, y)));
}

export function projectBoundsToScreenRect(
    bounds: BoundingBox3,
    camera: CameraState,
    viewportSize: ViewportSize,
): ScreenRect {
    const basis = calculateCameraBasis(camera);
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const corner of BBox3.fromBoundsLike(bounds).corners()) {
        const point = projectWorldToScreen(corner, camera, viewportSize, basis);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    return { maxX, maxY, minX, minY };
}
