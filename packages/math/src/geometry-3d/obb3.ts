import type { Coord3 } from '../coordinate/coord3';
import { Vec3, type Vector3 } from '../linear/vec3';

export class OBB3 {
    private readonly frameReference: Coord3;
    private readonly halfSizeSnapshot: Vec3;

    constructor(frame: Coord3, halfSize: Vector3) {
        this.frameReference = frame;
        this.halfSizeSnapshot = Vec3.from(halfSize);
    }

    public get frame(): Coord3 {
        return this.frameReference;
    }

    public get halfSize(): Vector3 {
        return Vec3.from(this.halfSizeSnapshot);
    }
}
