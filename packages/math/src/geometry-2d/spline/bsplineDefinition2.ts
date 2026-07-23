import { Vec2, type Vector2 } from '../../linear/vec2';
import { BSplineBasisDefinition } from './bsplineBasisDefinition';
import { BSplineKnotVector } from './bsplineKnotVector';

export interface BSplineDefinition2Input {
    readonly controlPoints: readonly Vector2[];
    readonly degree: number;
    readonly knots: readonly number[];
}

export class BSplineDefinition2 {
    public readonly basisDefinition: BSplineBasisDefinition;
    private readonly controlPointSnapshot: readonly Vec2[];

    constructor(input: BSplineDefinition2Input) {
        this.controlPointSnapshot = input.controlPoints.map((point) => Vec2.from(point));
        this.basisDefinition = new BSplineBasisDefinition({
            controlPointCount: this.controlPointSnapshot.length,
            degree: input.degree,
            knotVector: new BSplineKnotVector(input.knots),
        });
    }

    public get controlPoints(): readonly Vec2[] {
        return this.controlPointSnapshot.map((point) => Vec2.from(point));
    }

    public isValid(): boolean {
        return (
            this.basisDefinition.isValid() &&
            this.controlPointSnapshot.every((point) => point.isFinite())
        );
    }
}
