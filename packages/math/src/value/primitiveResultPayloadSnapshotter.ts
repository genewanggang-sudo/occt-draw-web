import { ResultPayloadSnapshotter } from './resultPayloadSnapshotter';

export type ResultPrimitive = bigint | boolean | null | number | string | symbol | undefined;

export class PrimitiveResultPayloadSnapshotter<TValue> extends ResultPayloadSnapshotter<TValue> {
    public snapshot(value: TValue): TValue {
        if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
            throw new TypeError('Object result payloads require an explicit snapshotter');
        }

        return value;
    }
}
