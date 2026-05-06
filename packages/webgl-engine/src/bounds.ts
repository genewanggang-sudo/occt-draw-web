import type { RenderScene, RenderNode } from './types';
import { BBox3, Vec3, type Vector3 } from '@occt-draw/math';
import type { BoundingBox3, BoundingSphere } from './types';

const DEFAULT_BOUNDS = new BBox3(Vec3.of(-1, -1, -1), Vec3.of(1, 1, 1));

export function calculateRenderSceneBoundingBox(scene: RenderScene): BoundingBox3 {
    return calculateRenderSceneBoundingBoxByPredicate(scene, () => true);
}

export function calculateRenderSceneNavigationBoundingBox(scene: RenderScene): BoundingBox3 {
    return calculateRenderSceneBoundingBoxByPredicate(
        scene,
        (object) => object.depthRole !== 'excluded',
    );
}

export function calculateRenderSceneBoundingSphere(scene: RenderScene): BoundingSphere {
    return calculateBoundingSphere(calculateRenderSceneBoundingBox(scene));
}

export function calculateRenderSceneNavigationBoundingSphere(scene: RenderScene): BoundingSphere {
    return calculateBoundingSphere(calculateRenderSceneNavigationBoundingBox(scene));
}

function calculateRenderSceneBoundingBoxByPredicate(
    scene: RenderScene,
    shouldIncludeObject: (object: RenderNode) => boolean,
): BoundingBox3 {
    let bounds: BBox3 | null = null;

    for (const object of scene.nodes) {
        if (!object.visible || !shouldIncludeObject(object)) {
            continue;
        }

        bounds = expandBoundsByObject(bounds, object);
    }

    return bounds ?? DEFAULT_BOUNDS;
}

export function calculateBoundingSphere(bounds: BoundingBox3): BoundingSphere {
    return new BBox3(bounds.min, bounds.max).toBoundingSphere(1);
}

export function getBoundingBoxCorners(bounds: BoundingBox3): readonly Vector3[] {
    return new BBox3(bounds.min, bounds.max).corners();
}

function expandBoundsByObject(bounds: BBox3 | null, object: RenderNode): BBox3 {
    if (object.kind === 'label-batch') {
        return expandBoundsByPoints(
            bounds,
            object.labels.map((label) =>
                Vec3.add(
                    Vec3.add(label.frame.origin, Vec3.scale(label.frame.xAxis, label.insert.x)),
                    Vec3.scale(label.frame.yAxis, label.insert.y),
                ),
            ),
        );
    }

    if (object.kind === 'line-batch') {
        return expandBoundsByPoints(
            bounds,
            object.segments.flatMap((segment) => [segment.start, segment.end]),
        );
    }

    if (object.kind === 'point-batch') {
        return expandBoundsByPoints(bounds, object.points);
    }

    if (object.kind === 'marker-batch') {
        return expandBoundsByPoints(
            bounds,
            object.markers.map((marker) => marker.position),
        );
    }

    return expandBoundsByPoints(
        bounds,
        object.triangles.flatMap((triangle) => [triangle.a, triangle.b, triangle.c]),
    );
}

function expandBoundsByPoints(bounds: BBox3 | null, points: readonly Vector3[]): BBox3 {
    let nextBounds = bounds;

    for (const point of points) {
        nextBounds = expandBoundsByPoint(nextBounds, point);
    }

    return nextBounds ?? DEFAULT_BOUNDS;
}

function expandBoundsByPoint(bounds: BBox3 | null, point: Vector3): BBox3 {
    return bounds ? bounds.expandByPoint(point) : new BBox3(point, point);
}
