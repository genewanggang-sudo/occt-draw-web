import type { Tolerance } from '../../value/tolerance';
import type { BSplineBasisDefinition } from './bsplineBasisDefinition';

export type BSplineDerivativeOrder = 0 | 1 | 2;

export class BSplineBasisEvaluator {
    private readonly definition: BSplineBasisDefinition;
    private readonly tolerance: Tolerance;

    constructor(definition: BSplineBasisDefinition, tolerance: Tolerance) {
        this.definition = definition;
        this.tolerance = tolerance;
    }

    public basisValuesAt(parameter: number): readonly number[] {
        if (!Number.isInteger(this.definition.degree) || this.definition.degree < 0) {
            return Array.from(
                { length: Math.max(this.definition.controlPointCount, 0) },
                () => Number.NaN,
            );
        }

        const parameterValue = this.definition.clampParameter(parameter);

        return Array.from({ length: this.definition.controlPointCount }, (_, index) =>
            this.basisValue(index, this.definition.degree, parameterValue),
        );
    }

    public rowAt(
        parameter: number,
        derivativeOrder: BSplineDerivativeOrder,
    ): readonly number[] | null {
        if (!this.definition.isValid() || !Number.isFinite(parameter)) {
            return null;
        }

        const parameterValue = this.definition.clampParameter(parameter);
        const values = Array.from({ length: this.definition.controlPointCount }, (_, index) => {
            if (derivativeOrder === 1) {
                return this.basisDerivativeValue(index, this.definition.degree, parameterValue);
            }

            if (derivativeOrder === 2) {
                return this.basisSecondDerivativeValue(
                    index,
                    this.definition.degree,
                    parameterValue,
                );
            }

            return this.basisValue(index, this.definition.degree, parameterValue);
        });

        return values.length === this.definition.controlPointCount && values.every(Number.isFinite)
            ? values
            : null;
    }

    private basisValue(index: number, degree: number, parameter: number): number {
        const knot = this.knotValueAt(index);
        const nextKnot = this.knotValueAt(index + 1);

        if (degree === 0) {
            return (knot <= parameter && parameter < nextKnot) ||
                (parameter === this.definition.domain.max && parameter === nextKnot)
                ? 1
                : 0;
        }

        const leftDenominator = this.knotValueAt(index + degree) - knot;
        const rightDenominator = this.knotValueAt(index + degree + 1) - nextKnot;
        const left = this.tolerance.isNearZeroParameter(leftDenominator)
            ? 0
            : ((parameter - knot) / leftDenominator) *
              this.basisValue(index, degree - 1, parameter);
        const right = this.tolerance.isNearZeroParameter(rightDenominator)
            ? 0
            : ((this.knotValueAt(index + degree + 1) - parameter) / rightDenominator) *
              this.basisValue(index + 1, degree - 1, parameter);

        return left + right;
    }

    private basisDerivativeValue(index: number, degree: number, parameter: number): number {
        if (degree <= 0) {
            return 0;
        }

        const leftDenominator = this.knotValueAt(index + degree) - this.knotValueAt(index);
        const rightDenominator = this.knotValueAt(index + degree + 1) - this.knotValueAt(index + 1);
        const left = this.tolerance.isNearZeroParameter(leftDenominator)
            ? 0
            : (degree / leftDenominator) * this.basisValue(index, degree - 1, parameter);
        const right = this.tolerance.isNearZeroParameter(rightDenominator)
            ? 0
            : (degree / rightDenominator) * this.basisValue(index + 1, degree - 1, parameter);

        return left - right;
    }

    private basisSecondDerivativeValue(index: number, degree: number, parameter: number): number {
        if (degree <= 1) {
            return 0;
        }

        const leftDenominator = this.knotValueAt(index + degree) - this.knotValueAt(index);
        const rightDenominator = this.knotValueAt(index + degree + 1) - this.knotValueAt(index + 1);
        const left = this.tolerance.isNearZeroParameter(leftDenominator)
            ? 0
            : (degree / leftDenominator) * this.basisDerivativeValue(index, degree - 1, parameter);
        const right = this.tolerance.isNearZeroParameter(rightDenominator)
            ? 0
            : (degree / rightDenominator) *
              this.basisDerivativeValue(index + 1, degree - 1, parameter);

        return left - right;
    }

    private knotValueAt(index: number): number {
        return this.definition.knotVector.valueAt(index) ?? 0;
    }
}
