import { Vec3, type Vector3 } from '../linear/vec3';
import { MATH_EPSILON } from '../value/tolerance';

export class Sphere3 {
    public readonly center: Vec3;
    public readonly radius: number;

    constructor(center: Vector3, radius: number) {
        this.center = Vec3.from(center);
        this.radius = radius;
    }

    public isValid(): boolean {
        return this.center.isFinite() && Number.isFinite(this.radius) && this.radius > MATH_EPSILON;
    }
}
