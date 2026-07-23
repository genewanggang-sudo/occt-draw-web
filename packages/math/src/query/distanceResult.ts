import { Vec2, type Vector2 } from '../linear/vec2';
import { Vec3, type Vector3 } from '../linear/vec3';
import type { GeometryResultStatus } from '../value/result';

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
    public readonly closestPoint: TPoint;
    public readonly distance: number;
    public readonly parameter: number;
    public readonly status: GeometryResultStatus;
    public readonly success: boolean;

    constructor(input: DistanceResultInput<TPoint>) {
        this.closestPoint = DistanceResult.snapshotClosestPoint(input.closestPoint);
        this.distance = input.distance;
        this.parameter = input.parameter;
        this.status = input.status;
        this.success = input.status === 'success';
    }

    public static create<TPoint>(input: DistanceResultInput<TPoint>): DistanceResult<TPoint> {
        return new DistanceResult(input);
    }

    public static success<TPoint>(input: DistanceResultValue<TPoint>): DistanceResult<TPoint> {
        return new DistanceResult({ ...input, status: 'success' });
    }

    public static degenerate<TPoint>(input: DistanceResultValue<TPoint>): DistanceResult<TPoint> {
        return new DistanceResult({ ...input, status: 'degenerate' });
    }

    private static snapshotClosestPoint<TPoint>(point: TPoint): TPoint {
        if (DistanceResult.isVector3(point)) {
            return Vec3.from(point) as TPoint;
        }

        if (DistanceResult.isVector2(point)) {
            return Vec2.from(point) as TPoint;
        }

        return point;
    }

    private static isVector2(value: unknown): value is Vector2 {
        return (
            typeof value === 'object' &&
            value !== null &&
            'x' in value &&
            'y' in value &&
            typeof value.x === 'number' &&
            typeof value.y === 'number'
        );
    }

    private static isVector3(value: unknown): value is Vector3 {
        return DistanceResult.isVector2(value) && 'z' in value && typeof value.z === 'number';
    }
}
