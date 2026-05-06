import { Vec3, type Vector3 } from '../linear/vec3';

export class Sphere3 {
    public readonly center: Vec3;
    public readonly radius: number;

    constructor(center: Vector3, radius: number) {
        this.center = Vec3.from(center);
        this.radius = Math.max(radius, 0);
    }
}
