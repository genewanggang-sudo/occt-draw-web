import { Vec3, type Vector3 } from '../linear/vec3';
import { Sphere3 } from './sphere3';

export interface BoundsLike3 {
    readonly max: Vector3;
    readonly min: Vector3;
}

export class BBox3 {
    public readonly max: Vec3;
    public readonly min: Vec3;

    constructor(min: Vector3, max: Vector3) {
        this.min = Vec3.of(Math.min(min.x, max.x), Math.min(min.y, max.y), Math.min(min.z, max.z));
        this.max = Vec3.of(Math.max(min.x, max.x), Math.max(min.y, max.y), Math.max(min.z, max.z));
    }

    public get center(): Vec3 {
        return Vec3.of(
            (this.min.x + this.max.x) / 2,
            (this.min.y + this.max.y) / 2,
            (this.min.z + this.max.z) / 2,
        );
    }

    public get size(): Vec3 {
        return this.min.vectorTo(this.max);
    }

    public contains(point: Vector3): boolean {
        return (
            point.x >= this.min.x &&
            point.x <= this.max.x &&
            point.y >= this.min.y &&
            point.y <= this.max.y &&
            point.z >= this.min.z &&
            point.z <= this.max.z
        );
    }

    public corners(): readonly Vec3[] {
        return [
            Vec3.of(this.min.x, this.min.y, this.min.z),
            Vec3.of(this.max.x, this.min.y, this.min.z),
            Vec3.of(this.min.x, this.max.y, this.min.z),
            Vec3.of(this.max.x, this.max.y, this.min.z),
            Vec3.of(this.min.x, this.min.y, this.max.z),
            Vec3.of(this.max.x, this.min.y, this.max.z),
            Vec3.of(this.min.x, this.max.y, this.max.z),
            Vec3.of(this.max.x, this.max.y, this.max.z),
        ];
    }

    public expandByPoint(point: Vector3): BBox3 {
        return new BBox3(
            Vec3.of(
                Math.min(this.min.x, point.x),
                Math.min(this.min.y, point.y),
                Math.min(this.min.z, point.z),
            ),
            Vec3.of(
                Math.max(this.max.x, point.x),
                Math.max(this.max.y, point.y),
                Math.max(this.max.z, point.z),
            ),
        );
    }

    public union(other: BBox3): BBox3 {
        return this.expandByPoint(other.min).expandByPoint(other.max);
    }

    public diagonalLength(): number {
        return this.min.distanceTo(this.max);
    }

    public isFinite(): boolean {
        return this.min.isFinite() && this.max.isFinite();
    }

    public toBoundingSphere(minRadius = 0): Sphere3 {
        return new Sphere3(this.center, Math.max(this.max.distanceTo(this.center), minRadius));
    }

    public static fromBoundsLike(bounds: BoundsLike3): BBox3 {
        return new BBox3(bounds.min, bounds.max);
    }

    public static fromPoints(points: readonly Vector3[], fallback?: BBox3): BBox3 {
        let bounds: BBox3 | null = null;

        for (const point of points) {
            bounds = bounds ? bounds.expandByPoint(point) : new BBox3(point, point);
        }

        return bounds ?? fallback ?? new BBox3(Vec3.of(-1, -1, -1), Vec3.of(1, 1, 1));
    }
}
