import { Vec2 } from '../../linear/vec2';
import { GeometryResult } from '../../value/result';
import { BSplineBasisEvaluator } from './bsplineBasisEvaluator';
import { FitSpline2ConstraintSystem } from './fitSpline2ConstraintSystem';
import type { Tolerance } from '../../value/tolerance';
import type { BSplineBasisDefinition } from './bsplineBasisDefinition';
import type { BSplineDerivativeOrder } from './bsplineBasisEvaluator';
import type { FitSpline2ParameterSet } from './fitSpline2ParameterSet';
import type { FitSpline2Specification } from './fitSpline2Specification';

export class FitSpline2ConstraintSystemBuilder {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public build(
        specification: FitSpline2Specification,
        parameters: FitSpline2ParameterSet,
        basisDefinition: BSplineBasisDefinition,
    ): GeometryResult<FitSpline2ConstraintSystem> {
        if (
            !parameters.isValid() ||
            !basisDefinition.isValid() ||
            parameters.count !== specification.fitPoints.length ||
            basisDefinition.controlPointCount !== specification.controlPointCount ||
            specification.controlPointCount !== specification.fitPoints.length + 2
        ) {
            return GeometryResult.degenerate();
        }

        const evaluator = new BSplineBasisEvaluator(basisDefinition, this.tolerance);
        const coefficientMatrix: number[][] = [];
        const xValues: number[] = [];
        const yValues: number[] = [];

        for (let index = 0; index < specification.fitPoints.length; index += 1) {
            const parameter = parameters.valueAt(index);
            const point = specification.fitPoints[index];

            if (parameter === undefined || !point) {
                return GeometryResult.degenerate();
            }

            const row = evaluator.rowAt(parameter, 0);

            if (!this.isCompleteRow(row, specification.controlPointCount)) {
                return GeometryResult.degenerate();
            }

            coefficientMatrix.push([...row]);
            xValues.push(point.x);
            yValues.push(point.y);
        }

        const startParameter = parameters.start;
        const endParameter = parameters.end;

        if (startParameter === undefined || endParameter === undefined) {
            return GeometryResult.degenerate();
        }

        const startOrder: BSplineDerivativeOrder = specification.startTangent ? 1 : 2;
        const endOrder: BSplineDerivativeOrder = specification.endTangent ? 1 : 2;
        const startRow = evaluator.rowAt(startParameter, startOrder);
        const endRow = evaluator.rowAt(endParameter, endOrder);

        if (
            !this.isCompleteRow(startRow, specification.controlPointCount) ||
            !this.isCompleteRow(endRow, specification.controlPointCount)
        ) {
            return GeometryResult.degenerate();
        }

        const startValue = specification.startTangent ?? Vec2.zero();
        const endValue = specification.endTangent ?? Vec2.zero();

        coefficientMatrix.push([...startRow], [...endRow]);
        xValues.push(startValue.x, endValue.x);
        yValues.push(startValue.y, endValue.y);

        return FitSpline2ConstraintSystem.create({
            coefficientMatrix,
            controlPointCount: specification.controlPointCount,
            fitPointCount: specification.fitPoints.length,
            xValues,
            yValues,
        });
    }

    private isCompleteRow(
        row: readonly number[] | null,
        expectedLength: number,
    ): row is readonly number[] {
        return (
            row !== null &&
            row.length === expectedLength &&
            row.every((value) => Number.isFinite(value))
        );
    }
}
