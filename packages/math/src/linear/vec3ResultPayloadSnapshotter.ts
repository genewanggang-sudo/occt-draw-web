import { ResultPayloadSnapshotter } from '../value/resultPayloadSnapshotter';
import { Vec3 } from './vec3';

export class Vec3ResultPayloadSnapshotter extends ResultPayloadSnapshotter<Vec3> {
    public snapshot(value: Vec3): Vec3 {
        return Vec3.from(value);
    }
}
