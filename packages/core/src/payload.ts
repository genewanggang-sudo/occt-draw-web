export type Payload = object;
export type PayloadId = string;

export class PayloadStore<
    TPayloadId extends string = PayloadId,
    TPayload extends Payload = Payload,
> {
    private readonly payloads: ReadonlyMap<TPayloadId, TPayload>;

    constructor(payloads?: Iterable<readonly [TPayloadId, TPayload]>) {
        const emptyPayloads: readonly (readonly [TPayloadId, TPayload])[] = [];

        this.payloads = new Map(payloads ?? emptyPayloads);
    }

    public find(payloadId: TPayloadId): TPayload | null {
        return this.payloads.get(payloadId) ?? null;
    }

    public set(payloadId: TPayloadId, payload: TPayload): PayloadStore<TPayloadId, TPayload> {
        return new PayloadStore([...this.payloads, [payloadId, payload]]);
    }

    protected entries(): readonly (readonly [TPayloadId, TPayload])[] {
        return [...this.payloads];
    }
}
