import { Vec2, type Vector2 } from '../linear/vec2';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BSpline2 } from './bspline2';

export class Nurbs2 extends BSpline2 {
    private readonly weightSnapshot: readonly number[];

    constructor(input: {
        readonly controlPoints: readonly Vector2[];
        readonly degree: number;
        readonly knots: readonly number[];
        readonly weights: readonly number[];
    }) {
        super(input);
        this.weightSnapshot = [...input.weights];
    }

    public get weights(): readonly number[] {
        return [...this.weightSnapshot];
    }

    public override pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return Vec2.zero();
        }

        const basisValues = this.basisValues(parameter);
        let denominator = 0;
        let numerator = Vec2.zero();

        for (let index = 0; index < this.controlPointCount; index += 1) {
            const weight = this.weightSnapshot[index];
            const basisValue = basisValues[index];
            const point = this.controlPointAt(index);

            if (weight === undefined || basisValue === undefined || !point) {
                return Vec2.zero();
            }

            const weightedBasis = basisValue * weight;

            denominator += weightedBasis;
            numerator = numerator.translated(point.scale(weightedBasis));
        }

        return DEFAULT_TOLERANCE.isNearZeroParameter(denominator)
            ? Vec2.zero()
            : numerator.scale(1 / denominator);
    }

    public override isValid(): boolean {
        return (
            super.isValid() &&
            this.weightSnapshot.length === this.controlPointCount &&
            this.weightSnapshot.every((weight) => Number.isFinite(weight) && weight > 0)
        );
    }
}
