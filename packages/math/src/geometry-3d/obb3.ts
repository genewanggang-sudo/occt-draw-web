import type { Coord3 } from '../coordinate/coord3';
import type { Vector3 } from '../linear/vec3';

export class OBB3 {
    public readonly frame: Coord3;
    public readonly halfSize: Vector3;

    constructor(frame: Coord3, halfSize: Vector3) {
        this.frame = frame;
        this.halfSize = halfSize;
    }
}
