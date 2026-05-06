import { Vec3, type Vector3 } from '../linear/vec3';
import { Scalar } from '../value/scalar';
import { MATH_EPSILON } from '../value/tolerance';

export class LineSegment3 {
    public readonly end: Vec3;
    public readonly start: Vec3;

    constructor(start: Vector3, end: Vector3) {
        this.start = Vec3.from(start);
        this.end = Vec3.from(end);
    }

    public length(): number {
        return this.start.distanceTo(this.end);
    }

    public pointAt(parameter: number): Vec3 {
        return this.start.translated(
            this.start.vectorTo(this.end).scale(Scalar.clamp(parameter, 0, 1)),
        );
    }

    public tangentAt(): Vec3 {
        return this.start.vectorTo(this.end).normalize();
    }

    public isValid(): boolean {
        return (
            this.start.isFinite() &&
            this.end.isFinite() &&
            this.start.distanceTo(this.end) > MATH_EPSILON
        );
    }
}
