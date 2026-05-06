import { Vec3, type Vector3 } from '../linear/vec3';

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
        return this.start.translated(this.start.vectorTo(this.end).scale(parameter));
    }
}
