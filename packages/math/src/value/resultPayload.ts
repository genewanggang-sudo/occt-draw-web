import type { ResultPayloadSnapshotter } from './resultPayloadSnapshotter';

export class ResultPayload<TValue> {
    private readonly snapshotter: ResultPayloadSnapshotter<TValue>;
    private readonly valueSnapshot: TValue;

    constructor(value: TValue, snapshotter: ResultPayloadSnapshotter<TValue>) {
        this.snapshotter = snapshotter;
        this.valueSnapshot = snapshotter.snapshot(value);
    }

    public get value(): TValue {
        return this.snapshotter.snapshot(this.valueSnapshot);
    }
}
