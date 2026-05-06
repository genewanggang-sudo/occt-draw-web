import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';
import { GeometryResult } from '../value/result';
import { MATH_EPSILON } from '../value/tolerance';
import type { Ray3 } from './ray3';

export class Plane3 {
    public readonly normal: Vec3;
    public readonly origin: Vec3;
    public readonly xAxis: Vec3;
    public readonly yAxis: Vec3;

    constructor(origin: Vector3, normal: Vector3, xAxis?: Vector3) {
        this.origin = Vec3.from(origin);
        this.normal = normalizeNormal(normal);
        this.xAxis = normalizeXAxis(this.normal, xAxis);
        this.yAxis = this.normal.cross(this.xAxis).normalize();
    }

    public signedDistanceToPoint(point: Vector3): number {
        return this.origin.vectorTo(point).dot(this.normal);
    }

    public projectPoint(point: Vector3): Vec3 {
        return Vec3.from(point).translated(this.normal.scale(-this.signedDistanceToPoint(point)));
    }

    public intersectRayResult(ray: Ray3): GeometryResult<Vec3> {
        const denominator = ray.direction.dot(this.normal);

        if (Math.abs(denominator) <= MATH_EPSILON) {
            return Math.abs(this.signedDistanceToPoint(ray.origin)) <= MATH_EPSILON
                ? GeometryResult.coincident()
                : GeometryResult.parallel();
        }

        const distance = this.origin.vectorTo(ray.origin).dot(this.normal) / -denominator;

        return distance < 0
            ? GeometryResult.empty()
            : GeometryResult.success(ray.pointAt(distance));
    }

    public intersectRay(ray: Ray3): Vec3 | null {
        return this.intersectRayResult(ray).value;
    }

    public localToWorld(point: Vector2): Vec3 {
        return this.origin
            .translated(this.xAxis.scale(point.x))
            .translated(this.yAxis.scale(point.y));
    }

    public worldToLocal(point: Vector3): Vec2 {
        const vector = this.origin.vectorTo(point);

        return Vec2.of(vector.dot(this.xAxis), vector.dot(this.yAxis));
    }

    public projectPointToLocal(point: Vector3): Vec2 {
        return this.worldToLocal(this.projectPoint(point));
    }
}

export type Plane = Plane3;

function normalizeNormal(normal: Vector3): Vec3 {
    const value = Vec3.from(normal);

    return value.isFinite() && value.length() > MATH_EPSILON ? value.normalize() : Vec3.of(0, 0, 1);
}

function normalizeXAxis(normal: Vec3, xAxis: Vector3 | undefined): Vec3 {
    const projectedXAxis = xAxis
        ? Vec3.from(xAxis).subtract(normal.scale(Vec3.dot(xAxis, normal)))
        : Vec3.zero();

    if (projectedXAxis.isFinite() && projectedXAxis.length() > MATH_EPSILON) {
        return projectedXAxis.normalize();
    }

    const candidate = Math.abs(normal.x) < 0.9 ? Vec3.of(1, 0, 0) : Vec3.of(0, 1, 0);

    return candidate.subtract(normal.scale(candidate.dot(normal))).normalize();
}
