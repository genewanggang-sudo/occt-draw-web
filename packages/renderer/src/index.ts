import {
    addVector3,
    createVector3,
    lengthVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { SceneDocument, SceneObject } from '@occt-draw/scene';

export type CameraProjection = 'orthographic' | 'perspective';
export type RendererDirection = 'three-dimensional-cloud-cad';
export type RendererStatus = 'ready';

export interface RendererModuleManifest {
    readonly direction: RendererDirection;
    readonly name: '@occt-draw/renderer';
    readonly status: RendererStatus;
    readonly summary: string;
}

export interface ViewportSize {
    readonly height: number;
    readonly width: number;
}

export interface BoundingBox3 {
    readonly max: Vector3;
    readonly min: Vector3;
}

export interface BoundingSphere {
    readonly center: Vector3;
    readonly radius: number;
}

export interface CameraState {
    readonly far: number;
    readonly fovYRadians: number;
    readonly near: number;
    readonly orthographicHeight: number;
    readonly position: Vector3;
    readonly projection: CameraProjection;
    readonly target: Vector3;
    readonly up: Vector3;
}

export interface RenderFrameInput {
    readonly camera: CameraState;
    readonly scene: SceneDocument;
    readonly viewportSize: ViewportSize;
}

export interface CadRenderer {
    dispose(): void;
    render(input: RenderFrameInput): void;
    resize(viewportSize: ViewportSize): void;
}

export const RENDERER_MODULE_MANIFEST: RendererModuleManifest = {
    direction: 'three-dimensional-cloud-cad',
    name: '@occt-draw/renderer',
    status: 'ready',
    summary: '三维渲染抽象接口，负责隔离工作台与具体 WebGL 后端。',
};

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

export function getRendererModuleManifest(): RendererModuleManifest {
    return RENDERER_MODULE_MANIFEST;
}

export function createCameraStateForScene(scene: SceneDocument): CameraState {
    const sphere = calculateSceneBoundingSphere(scene);
    const safeRadius = Math.max(sphere.radius, 1);
    const viewDirection = createVector3(1, 0.75, 1);
    const distance = safeRadius * 3.5;
    const target = sphere.center;
    const position = addVector3(
        target,
        scaleVector3(viewDirection, distance / lengthVector3(viewDirection)),
    );

    return {
        projection: 'orthographic',
        position,
        target,
        up: createVector3(0, 1, 0),
        orthographicHeight: safeRadius * 2.4,
        fovYRadians: Math.PI / 4,
        near: 0.1,
        far: safeRadius * 12,
    };
}

export function calculateSceneBoundingSphere(scene: SceneDocument): BoundingSphere {
    const bounds = calculateSceneBoundingBox(scene);
    const center = scaleVector3(addVector3(bounds.min, bounds.max), 0.5);
    const radius = Math.max(lengthVector3(subtractVector3(bounds.max, center)), 1);

    return { center, radius };
}

export function calculateSceneBoundingBox(scene: SceneDocument): BoundingBox3 {
    let bounds: BoundingBox3 | null = null;

    for (const object of scene.objects) {
        if (!object.visible) {
            continue;
        }

        bounds = expandBoundsByObject(bounds, object);
    }

    return (
        bounds ?? {
            min: createVector3(-1, -1, -1),
            max: createVector3(1, 1, 1),
        }
    );
}

function expandBoundsByObject(bounds: BoundingBox3 | null, object: SceneObject): BoundingBox3 {
    if (object.kind === 'grid') {
        const halfSize = object.size / 2;

        return expandBoundsByPoints(bounds, [
            createVector3(-halfSize, 0, -halfSize),
            createVector3(halfSize, 0, halfSize),
        ]);
    }

    if (object.kind === 'axis') {
        return expandBoundsByPoints(bounds, [
            createVector3(0, 0, 0),
            createVector3(object.length, 0, 0),
            createVector3(0, object.length, 0),
            createVector3(0, 0, object.length),
        ]);
    }

    const halfSize = object.size / 2;

    return expandBoundsByPoints(bounds, [
        createVector3(
            object.center.x - halfSize,
            object.center.y - halfSize,
            object.center.z - halfSize,
        ),
        createVector3(
            object.center.x + halfSize,
            object.center.y + halfSize,
            object.center.z + halfSize,
        ),
    ]);
}

function expandBoundsByPoints(
    bounds: BoundingBox3 | null,
    points: readonly Vector3[],
): BoundingBox3 {
    let nextBounds = bounds;

    for (const point of points) {
        nextBounds = expandBoundsByPoint(nextBounds, point);
    }

    return (
        nextBounds ?? {
            min: createVector3(-1, -1, -1),
            max: createVector3(1, 1, 1),
        }
    );
}

function expandBoundsByPoint(bounds: BoundingBox3 | null, point: Vector3): BoundingBox3 {
    if (!bounds) {
        return { min: point, max: point };
    }

    return {
        min: createVector3(
            Math.min(bounds.min.x, point.x),
            Math.min(bounds.min.y, point.y),
            Math.min(bounds.min.z, point.z),
        ),
        max: createVector3(
            Math.max(bounds.max.x, point.x),
            Math.max(bounds.max.y, point.y),
            Math.max(bounds.max.z, point.z),
        ),
    };
}
