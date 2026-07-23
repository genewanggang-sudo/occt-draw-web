import { Vec2, type Vector2 } from '../linear/vec2';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BSpline2 } from './bspline2';

export class Nurbs2 extends BSpline2 {
    public readonly weights: readonly number[];

    constructor(input: {
        readonly controlPoints: readonly Vector2[];
        readonly degree: number;
        readonly knots: readonly number[];
        readonly weights: readonly number[];
    }) {
        super(input);
        this.weights = [...input.weights];
    }

    public override pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return Vec2.zero();
        }

        const basisValues = this.basisValues(parameter);
        let denominator = 0;
        let numerator = Vec2.zero();

        for (let index = 0; index < this.controlPoints.length; index += 1) {
            const weight = this.weights[index];
            const basisValue = basisValues[index];
            const point = this.controlPoints[index];

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
            this.weights.length === this.controlPoints.length &&
            this.weights.every((weight) => Number.isFinite(weight) && weight > 0)
        );
    }
}
