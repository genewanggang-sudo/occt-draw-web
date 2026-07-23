import { GeometryResult } from '../../value/result';
import { BSplineKnotVector } from './bsplineKnotVector';
import type { FitSpline2ParameterSet } from './fitSpline2ParameterSet';
import type { FitSpline2Specification } from './fitSpline2Specification';

export class FitSpline2KnotVectorFactory {
    public create(
        specification: FitSpline2Specification,
        parameters: FitSpline2ParameterSet,
    ): GeometryResult<BSplineKnotVector> {
        if (
            !parameters.isValid() ||
            parameters.count !== specification.fitPoints.length ||
            specification.controlPointCount !== specification.fitPoints.length + 2
        ) {
            return GeometryResult.degenerate();
        }

        const knotCount = specification.controlPointCount + specification.degree + 1;
        const knots = Array<number>(knotCount).fill(0);

        for (let index = specification.controlPointCount; index < knotCount; index += 1) {
            knots[index] = 1;
        }

        for (let index = 1; index < parameters.count - 1; index += 1) {
            const parameter = parameters.valueAt(index);

            if (parameter === undefined) {
                return GeometryResult.degenerate();
            }

            knots[index + specification.degree] = parameter;
        }

        const knotVector = new BSplineKnotVector(knots);

        return knotVector.isFiniteNonDecreasing()
            ? GeometryResult.success(knotVector)
            : GeometryResult.degenerate();
    }
}
