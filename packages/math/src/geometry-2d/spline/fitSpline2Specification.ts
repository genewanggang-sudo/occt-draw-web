import { Vec2, type Vector2 } from '../../linear/vec2';

export type FitSplineParameterization = 'centripetal' | 'chord-length' | 'uniform';

export interface FitSpline2Input {
    readonly closed?: boolean;
    readonly degree?: number;
    readonly endTangent?: Vector2 | undefined;
    readonly fitPoints: readonly Vector2[];
    readonly parameterization?: FitSplineParameterization;
    readonly startTangent?: Vector2 | undefined;
}

export class FitSpline2Specification {
    public readonly closed: boolean;
    public readonly controlPointCount: number;
    public readonly degree: number;
    public readonly parameterization: FitSplineParameterization;
    private readonly endTangentSnapshot: Vec2 | null;
    private readonly fitPointSnapshot: readonly Vec2[];
    private readonly startTangentSnapshot: Vec2 | null;

    constructor(input: {
        readonly closed: boolean;
        readonly degree: number | undefined;
        readonly endTangent: Vec2 | null;
        readonly fitPoints: readonly Vec2[];
        readonly parameterization: FitSplineParameterization | undefined;
        readonly startTangent: Vec2 | null;
    }) {
        this.closed = input.closed;
        this.degree = FitSpline2Specification.normalizeDegree(input.degree);
        this.endTangentSnapshot = input.endTangent ? Vec2.from(input.endTangent) : null;
        this.fitPointSnapshot = input.fitPoints.map((point) => Vec2.from(point));
        this.controlPointCount = this.fitPointSnapshot.length + 2;
        this.parameterization = input.parameterization ?? 'centripetal';
        this.startTangentSnapshot = input.startTangent ? Vec2.from(input.startTangent) : null;
    }

    public get endTangent(): Vec2 | null {
        return this.endTangentSnapshot ? Vec2.from(this.endTangentSnapshot) : null;
    }

    public get fitPoints(): readonly Vec2[] {
        return this.fitPointSnapshot.map((point) => Vec2.from(point));
    }

    public get startTangent(): Vec2 | null {
        return this.startTangentSnapshot ? Vec2.from(this.startTangentSnapshot) : null;
    }

    private static normalizeDegree(_requestedDegree: number | undefined): number {
        return 3;
    }
}
