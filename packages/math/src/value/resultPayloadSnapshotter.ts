export abstract class ResultPayloadSnapshotter<TValue> {
    public abstract snapshot(value: TValue): TValue;
}
