import { MATH_EPSILON } from './tolerance';
import type { Vector2 } from './vector2';
import { Point2 } from './vector2';
import type { Vector3 } from './vector3';
import { Point3, Vec3 } from './vector3';
import type { Ray3 } from './ray';

export class Plane {
    public origin: Point3;
    public normal: Vec3;
    public xAxis: Vec3;
    public yAxis: Vec3;

    constructor(origin: Vector3, normal: Vector3, xAxis?: Vector3) {
        this.origin = Point3.from(origin);
        this.normal = Plane.normalizeNormal(normal);
        this.xAxis = Plane.normalizeXAxis(this.normal, xAxis);
        this.yAxis = this.normal.cross(this.xAxis).normalizeInPlace();
    }

    public signedDistanceToPoint(point: Vector3): number {
        return this.origin.vectorTo(point).dot(this.normal);
    }

    public projectPoint(point: Vector3): Point3 {
        return Point3.from(point).translated(
            this.normal.scaled(-this.signedDistanceToPoint(point)),
        );
    }

    public intersectRay(ray: Ray3): Point3 | null {
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

    public localToWorld(point: Vector2): Point3 {
        return this.origin
            .translated(this.xAxis.scaled(point.x))
            .translated(this.yAxis.scaled(point.y));
    }

    public worldToLocal(point: Vector3): Point2 {
        const vector = this.origin.vectorTo(point);

        return Point2.from({
            x: vector.dot(this.xAxis),
            y: vector.dot(this.yAxis),
        });
    }

    public projectPointToLocal(point: Vector3): Point2 {
        return this.worldToLocal(this.projectPoint(point));
    }

    private static normalizeNormal(normal: Vector3): Vec3 {
        const value = Vec3.from(normal);

        if (!Plane.isFiniteVector3(value) || value.length() <= MATH_EPSILON) {
            return new Vec3(0, 0, 1);
        }

        return value.normalizeInPlace();
    }

    private static normalizeXAxis(normal: Vec3, xAxis: Vector3 | undefined): Vec3 {
        const projectedXAxis = xAxis ? Plane.projectVectorToPlane(xAxis, normal) : Vec3.zero();

        if (Plane.isFiniteVector3(projectedXAxis) && projectedXAxis.length() > MATH_EPSILON) {
            return projectedXAxis.normalizeInPlace();
        }

        return Plane.createStableXAxis(normal);
    }

    private static projectVectorToPlane(vector: Vector3, normal: Vec3): Vec3 {
        const value = Vec3.from(vector);

        return value.subtractInPlace(normal.scaled(value.dot(normal)));
    }

    private static createStableXAxis(normal: Vec3): Vec3 {
        const candidate = Math.abs(normal.x) < 0.9 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);

        return Plane.projectVectorToPlane(candidate, normal).normalizeInPlace();
    }

    private static isFiniteVector3(vector: Vector3): boolean {
        return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
    }
}

export function createPlane(origin: Vector3, normal: Vector3, xAxis?: Vector3): Plane {
    return new Plane(origin, normal, xAxis);
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
