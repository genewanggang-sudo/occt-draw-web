import { NumberArrayResultPayloadSnapshotter } from '../value/numberArrayResultPayloadSnapshotter';
import { GeometryResult } from '../value/result';
import type { Tolerance } from '../value/tolerance';
import type { LinearEquationSystem } from './linearEquationSystem';

export class GaussianEliminationSolver {
    private readonly tolerance: Tolerance;

    constructor(tolerance: Tolerance) {
        this.tolerance = tolerance;
    }

    public solve(system: LinearEquationSystem): GeometryResult<readonly number[]> {
        if (!system.isValid()) {
            return GeometryResult.degenerate();
        }

        const size = system.size;
        const coefficientMatrix = system.coefficientMatrix;
        const rightHandSide = system.rightHandSide;
        const matrix: number[][] = [];

        for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
            const coefficientRow = coefficientMatrix[rowIndex];
            const rightHandSideValue = rightHandSide[rowIndex];

            if (
                !coefficientRow ||
                rightHandSideValue === undefined ||
                coefficientRow.length !== size
            ) {
                return GeometryResult.degenerate();
            }

            matrix.push([...coefficientRow, rightHandSideValue]);
        }

        for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
            const initialPivotRow = matrix[pivotIndex];

            if (!initialPivotRow) {
                return GeometryResult.degenerate();
            }

            const initialPivotValue = initialPivotRow[pivotIndex];

            if (initialPivotValue === undefined) {
                return GeometryResult.degenerate();
            }

            let pivotRow = pivotIndex;
            let pivotMagnitude = Math.abs(initialPivotValue);

            for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
                const row = matrix[rowIndex];
                const coefficient = row?.[pivotIndex];

                if (coefficient === undefined) {
                    return GeometryResult.degenerate();
                }

                const magnitude = Math.abs(coefficient);

                if (magnitude > pivotMagnitude) {
                    pivotMagnitude = magnitude;
                    pivotRow = rowIndex;
                }
            }

            if (pivotMagnitude <= this.tolerance.parameter) {
                return GeometryResult.degenerate();
            }

            if (pivotRow !== pivotIndex) {
                const current = matrix[pivotIndex];
                const pivot = matrix[pivotRow];

                if (!current || !pivot) {
                    return GeometryResult.degenerate();
                }

                matrix[pivotIndex] = pivot;
                matrix[pivotRow] = current;
            }

            const pivotRowValues = matrix[pivotIndex];
            const pivotValue = pivotRowValues?.[pivotIndex];

            if (!pivotRowValues || pivotValue === undefined) {
                return GeometryResult.degenerate();
            }

            for (let column = pivotIndex; column <= size; column += 1) {
                const value = pivotRowValues[column];

                if (value === undefined) {
                    return GeometryResult.degenerate();
                }

                const normalizedValue = value / pivotValue;

                if (!Number.isFinite(normalizedValue)) {
                    return GeometryResult.degenerate();
                }

                pivotRowValues[column] = normalizedValue;
            }

            for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
                if (rowIndex === pivotIndex) {
                    continue;
                }

                const row = matrix[rowIndex];
                const factor = row?.[pivotIndex];

                if (!row || factor === undefined) {
                    return GeometryResult.degenerate();
                }

                for (let column = pivotIndex; column <= size; column += 1) {
                    const value = row[column];
                    const pivotValueAtColumn = pivotRowValues[column];

                    if (value === undefined || pivotValueAtColumn === undefined) {
                        return GeometryResult.degenerate();
                    }

                    const eliminatedValue = value - factor * pivotValueAtColumn;

                    if (!Number.isFinite(eliminatedValue)) {
                        return GeometryResult.degenerate();
                    }

                    row[column] = eliminatedValue;
                }
            }
        }

        const result: number[] = [];

        for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
            const value = matrix[rowIndex]?.[size];

            if (value === undefined || !Number.isFinite(value)) {
                return GeometryResult.degenerate();
            }

            result.push(value);
        }

        return GeometryResult.success(result, new NumberArrayResultPayloadSnapshotter());
    }
}
