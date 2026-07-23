import { GeometryResult } from '../value/result';

export interface LinearEquationSystemInput {
    readonly coefficientMatrix: readonly (readonly number[])[];
    readonly rightHandSide: readonly number[];
}

export class LinearEquationSystem {
    private readonly coefficientMatrixValues: readonly (readonly number[])[];
    private readonly rightHandSideValues: readonly number[];

    private constructor(input: LinearEquationSystemInput) {
        this.coefficientMatrixValues = input.coefficientMatrix.map((row) => [...row]);
        this.rightHandSideValues = [...input.rightHandSide];
    }

    public get coefficientMatrix(): readonly (readonly number[])[] {
        return this.coefficientMatrixValues.map((row) => [...row]);
    }

    public get rightHandSide(): readonly number[] {
        return [...this.rightHandSideValues];
    }

    public get size(): number {
        return this.rightHandSideValues.length;
    }

    public isValid(): boolean {
        return LinearEquationSystem.isValidInput({
            coefficientMatrix: this.coefficientMatrixValues,
            rightHandSide: this.rightHandSideValues,
        });
    }

    public static create(input: LinearEquationSystemInput): GeometryResult<LinearEquationSystem> {
        if (!LinearEquationSystem.isValidInput(input)) {
            return GeometryResult.degenerate();
        }

        return GeometryResult.success(new LinearEquationSystem(input));
    }

    private static isValidInput(input: LinearEquationSystemInput): boolean {
        const size = input.rightHandSide.length;

        return (
            size > 0 &&
            input.coefficientMatrix.length === size &&
            input.rightHandSide.every(Number.isFinite) &&
            input.coefficientMatrix.every(
                (row) => row.length === size && row.every(Number.isFinite),
            )
        );
    }
}
