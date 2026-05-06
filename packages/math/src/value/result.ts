export type GeometryResultStatus = 'coincident' | 'degenerate' | 'empty' | 'parallel' | 'success';

export class GeometryResult<TValue> {
    public readonly status: GeometryResultStatus;
    public readonly value: TValue | null;

    private constructor(status: GeometryResultStatus, value: TValue | null) {
        this.status = status;
        this.value = value;
    }

    public get success(): boolean {
        return this.status === 'success';
    }

    public get failed(): boolean {
        return !this.success;
    }

    public valueOr(fallback: TValue): TValue {
        return this.value ?? fallback;
    }

    public static success<TValue>(value: TValue): GeometryResult<TValue> {
        return new GeometryResult('success', value);
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
