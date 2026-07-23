import { GeometryResult } from '../../value/result';
import { FitSpline2ParameterSet } from './fitSpline2ParameterSet';
import type { Tolerance } from '../../value/tolerance';
import type { FitSpline2Specification } from './fitSpline2Specification';

export class FitSpline2Parameterizer {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public parameterize(
        specification: FitSpline2Specification,
    ): GeometryResult<FitSpline2ParameterSet> {
        const values =
            specification.parameterization === 'uniform'
                ? this.createUniformValues(specification)
                : this.createDistanceWeightedValues(
                      specification,
                      specification.parameterization === 'centripetal',
                  );

        return values ? FitSpline2ParameterSet.create(values) : GeometryResult.degenerate();
    }

    private createDistanceWeightedValues(
        specification: FitSpline2Specification,
        useSquareRootDistance: boolean,
    ): readonly number[] | null {
        const cumulative = [0];
        let total = 0;

        for (let index = 1; index < specification.fitPoints.length; index += 1) {
            const previous = specification.fitPoints[index - 1];
            const current = specification.fitPoints[index];

            if (!previous || !current) {
                return null;
            }

            const distance = previous.distanceTo(current);
            const step = useSquareRootDistance ? Math.sqrt(distance) : distance;

            if (!Number.isFinite(step) || step <= this.tolerance.distance) {
                return null;
            }

            total += step;
            cumulative.push(total);
        }

        if (!Number.isFinite(total) || total <= this.tolerance.distance) {
            return null;
        }

        return cumulative.map((value) => value / total);
    }

    private createUniformValues(specification: FitSpline2Specification): readonly number[] {
        const denominator = specification.fitPoints.length - 1;

        return specification.fitPoints.map((_, index) => index / denominator);
    }
}
