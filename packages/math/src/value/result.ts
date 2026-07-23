import {
    PrimitiveResultPayloadSnapshotter,
    type ResultPrimitive,
} from './primitiveResultPayloadSnapshotter';
import { ResultPayload } from './resultPayload';
import type { ResultPayloadSnapshotter } from './resultPayloadSnapshotter';

export type GeometryResultStatus = 'coincident' | 'degenerate' | 'empty' | 'parallel' | 'success';

export class GeometryResult<TValue> {
    public readonly status: GeometryResultStatus;
    declare public readonly value: TValue | null;

    private constructor(status: GeometryResultStatus, payload: ResultPayload<TValue> | null) {
        this.status = status;
        Object.defineProperty(this, 'value', {
            enumerable: true,
            get: () => (payload === null ? null : payload.value),
        });
    }

    public get success(): boolean {
        return this.status === 'success';
    }

    public get failed(): boolean {
        return !this.success;
    }

    public static success<TValue extends ResultPrimitive>(value: TValue): GeometryResult<TValue>;
    public static success<TValue>(
        value: TValue,
        snapshotter: ResultPayloadSnapshotter<TValue>,
    ): GeometryResult<TValue>;
    public static success<TValue>(
        value: TValue,
        snapshotter?: ResultPayloadSnapshotter<TValue>,
    ): GeometryResult<TValue> {
        return new GeometryResult(
            'success',
            new ResultPayload(
                value,
                snapshotter ?? new PrimitiveResultPayloadSnapshotter<TValue>(),
            ),
        );
    }

    public static empty<TValue>(): GeometryResult<TValue> {
        return new GeometryResult<TValue>('empty', null);
    }

    public static parallel<TValue>(): GeometryResult<TValue> {
        return new GeometryResult<TValue>('parallel', null);
    }

    public static coincident<TValue>(): GeometryResult<TValue> {
        return new GeometryResult<TValue>('coincident', null);
    }

    public static degenerate<TValue>(): GeometryResult<TValue> {
        return new GeometryResult<TValue>('degenerate', null);
    }
}
