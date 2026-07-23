import type { GeometryResultStatus } from '../value/result';
import { ResultPayload } from '../value/resultPayload';
import type { ResultPayloadSnapshotter } from '../value/resultPayloadSnapshotter';

export interface DistanceResultInput<TPoint> {
    readonly closestPoint: TPoint;
    readonly distance: number;
    readonly parameter: number;
    readonly status: GeometryResultStatus;
}

export interface DistanceResultValue<TPoint> {
    readonly closestPoint: TPoint;
    readonly distance: number;
    readonly parameter: number;
}

export class DistanceResult<TPoint> {
    public readonly closestPoint!: TPoint;
    public readonly distance: number;
    public readonly parameter: number;
    public readonly status: GeometryResultStatus;
    public readonly success: boolean;

    constructor(input: DistanceResultInput<TPoint>, snapshotter: ResultPayloadSnapshotter<TPoint>) {
        const closestPointPayload = new ResultPayload(input.closestPoint, snapshotter);
        Object.defineProperty(this, 'closestPoint', {
            enumerable: true,
            get: () => closestPointPayload.value,
        });
        this.distance = input.distance;
        this.parameter = input.parameter;
        this.status = input.status;
        this.success = input.status === 'success';
    }

    public static create<TPoint>(
        input: DistanceResultInput<TPoint>,
        snapshotter: ResultPayloadSnapshotter<TPoint>,
    ): DistanceResult<TPoint> {
        return new DistanceResult(input, snapshotter);
    }

    public static success<TPoint>(
        input: DistanceResultValue<TPoint>,
        snapshotter: ResultPayloadSnapshotter<TPoint>,
    ): DistanceResult<TPoint> {
        return new DistanceResult({ ...input, status: 'success' }, snapshotter);
    }

    public static degenerate<TPoint>(
        input: DistanceResultValue<TPoint>,
        snapshotter: ResultPayloadSnapshotter<TPoint>,
    ): DistanceResult<TPoint> {
        return new DistanceResult({ ...input, status: 'degenerate' }, snapshotter);
    }
}
