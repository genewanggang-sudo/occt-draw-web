import { Vec3, type Vector3 } from '../linear/vec3';

export class Ray3 {
    public readonly direction: Vec3;
    public readonly origin: Vec3;

    constructor(origin: Vector3, direction: Vector3) {
        this.origin = Vec3.from(origin);
        this.direction = Vec3.from(direction).normalize();
    }

    public pointAt(distance: number): Vec3 {
        return this.origin.translated(this.direction.scale(distance));
    }
}
