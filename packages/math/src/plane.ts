import { MATH_EPSILON } from './tolerance';
import type { Vector3 } from './vector3';
import { Point3, Vec3 } from './vector3';
import type { Ray3 } from './ray';

export class Plane {
    origin: Point3;
    normal: Vec3;

    constructor(origin: Vector3, normal: Vector3) {
        this.origin = Point3.from(origin);
        this.normal = Vec3.from(normal).normalizeInPlace();
    }

    signedDistanceToPoint(point: Vector3): number {
        return this.origin.vectorTo(point).dot(this.normal);
    }

    projectPoint(point: Vector3): Point3 {
        return Point3.from(point).translated(
            this.normal.scaled(-this.signedDistanceToPoint(point)),
        );
    }

    intersectRay(ray: Ray3): Point3 | null {
        const denominator = ray.direction.dot(this.normal);

        if (Math.abs(denominator) <= MATH_EPSILON) {
            return null;
        }

        const distance = this.origin.vectorTo(ray.origin).dot(this.normal) / -denominator;

        if (distance < 0) {
            return null;
        }

        return ray.pointAt(distance);
    }
}

export function createPlane(origin: Vector3, normal: Vector3): Plane {
    return new Plane(origin, normal);
}

export function signedDistanceToPlane(plane: Plane, point: Vector3): number {
    return plane.signedDistanceToPoint(point);
}

export function projectPointToPlane(plane: Plane, point: Vector3): Point3 {
    return plane.projectPoint(point);
}

export function intersectRayWithPlane(ray: Ray3, plane: Plane): Point3 | null {
    return plane.intersectRay(ray);
}
