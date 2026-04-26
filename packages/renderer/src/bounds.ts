import {
    addVector3,
    createVector3,
    lengthVector3,
    scaleVector3,
    subtractVector3,
    type Vector3,
} from '@occt-draw/math';
import type { SceneDocument, SceneObject } from '@occt-draw/scene';
import type { BoundingBox3, BoundingSphere } from './types';

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

export function calculateSceneBoundingSphere(scene: SceneDocument): BoundingSphere {
    return calculateBoundingSphere(calculateSceneBoundingBox(scene));
}

export function calculateBoundingSphere(bounds: BoundingBox3): BoundingSphere {
    const center = scaleVector3(addVector3(bounds.min, bounds.max), 0.5);
    const radius = Math.max(lengthVector3(subtractVector3(bounds.max, center)), 1);

    return { center, radius };
}

export function getBoundingBoxCorners(bounds: BoundingBox3): readonly Vector3[] {
    return [
        createVector3(bounds.min.x, bounds.min.y, bounds.min.z),
        createVector3(bounds.max.x, bounds.min.y, bounds.min.z),
        createVector3(bounds.min.x, bounds.max.y, bounds.min.z),
        createVector3(bounds.max.x, bounds.max.y, bounds.min.z),
        createVector3(bounds.min.x, bounds.min.y, bounds.max.z),
        createVector3(bounds.max.x, bounds.min.y, bounds.max.z),
        createVector3(bounds.min.x, bounds.max.y, bounds.max.z),
        createVector3(bounds.max.x, bounds.max.y, bounds.max.z),
    ];
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
        return expandBoundsByPoint(bounds, createVector3(0, 0, 0));
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
