import { BBox3, Vec3, type Vector3 } from '@occt-draw/math';
import type { BoundingBox3, BoundingSphere } from './types';

const DEFAULT_BOUNDS = new BBox3(Vec3.of(-1, -1, -1), Vec3.of(1, 1, 1));

export function calculateBoundingSphere(bounds: BoundingBox3): BoundingSphere {
    return new BBox3(bounds.min, bounds.max).toBoundingSphere(1);
}

export function getBoundingBoxCorners(bounds: BoundingBox3): readonly Vector3[] {
    return new BBox3(bounds.min, bounds.max).corners();
}

export function getDefaultBoundingBox(): BoundingBox3 {
    return DEFAULT_BOUNDS;
}
