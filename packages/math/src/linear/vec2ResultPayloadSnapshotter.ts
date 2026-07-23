import { ResultPayloadSnapshotter } from '../value/resultPayloadSnapshotter';
import { Vec2 } from './vec2';

export class Vec2ResultPayloadSnapshotter extends ResultPayloadSnapshotter<Vec2> {
    public snapshot(value: Vec2): Vec2 {
        return Vec2.from(value);
    }
}
