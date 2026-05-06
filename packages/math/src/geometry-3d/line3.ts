import { Vec3, type Vector3 } from '../linear/vec3';
import { MATH_EPSILON } from '../value/tolerance';

export class Line3 {
    public readonly direction: Vec3;
    public readonly origin: Vec3;

    constructor(origin: Vector3, direction: Vector3) {
        this.origin = Vec3.from(origin);
        this.direction = Vec3.from(direction).normalize();
    }

    public pointAt(parameter: number): Vec3 {
        return this.origin.translated(this.direction.scale(parameter));
    }

    public isValid(): boolean {
        return (
            this.origin.isFinite() &&
            this.direction.isFinite() &&
            this.direction.length() > MATH_EPSILON
        );
    }
}
