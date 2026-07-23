import { ResultPayloadSnapshotter } from './resultPayloadSnapshotter';

export class NumberArrayResultPayloadSnapshotter extends ResultPayloadSnapshotter<
    readonly number[]
> {
    public snapshot(value: readonly number[]): readonly number[] {
        return [...value];
    }
}
