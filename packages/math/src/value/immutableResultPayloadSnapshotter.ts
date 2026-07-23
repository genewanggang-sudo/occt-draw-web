import { ResultPayloadSnapshotter } from './resultPayloadSnapshotter';

export class ImmutableResultPayloadSnapshotter<TValue> extends ResultPayloadSnapshotter<TValue> {
    public snapshot(value: TValue): TValue {
        return value;
    }
}
