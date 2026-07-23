import { Vec3, type Vector3 } from '../linear/vec3';

export class Triangle3 {
    public readonly a: Vector3;
    public readonly b: Vector3;
    public readonly c: Vector3;

    constructor(a: Vector3, b: Vector3, c: Vector3) {
        this.a = Vec3.from(a);
        this.b = Vec3.from(b);
        this.c = Vec3.from(c);
    }
}
