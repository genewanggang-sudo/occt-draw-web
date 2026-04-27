import type { Vector3 } from './vector3';
import { Point3, Vec3 } from './vector3';

export class Ray3 {
    origin: Point3;
    direction: Vec3;

    constructor(origin: Vector3, direction: Vector3) {
        this.origin = Point3.from(origin);
        this.direction = Vec3.from(direction).normalizeInPlace();
    }

    pointAt(distance: number): Point3 {
        return this.origin.translated(this.direction.scaled(distance));
    }
}

export function createRay3(origin: Vector3, direction: Vector3): Ray3 {
    return new Ray3(origin, direction);
}
