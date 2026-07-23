import { LinearEquationSystem } from '../../linear/linearEquationSystem';
import { ImmutableResultPayloadSnapshotter } from '../../value/immutableResultPayloadSnapshotter';
import { GeometryResult } from '../../value/result';

export class FitSpline2ConstraintSystem {
    public readonly controlPointCount: number;
    public readonly fitPointCount: number;
    public readonly xEquationSystem: LinearEquationSystem;
    public readonly yEquationSystem: LinearEquationSystem;

    private constructor(input: {
        readonly controlPointCount: number;
        readonly fitPointCount: number;
        readonly xEquationSystem: LinearEquationSystem;
        readonly yEquationSystem: LinearEquationSystem;
    }) {
        this.controlPointCount = input.controlPointCount;
        this.fitPointCount = input.fitPointCount;
        this.xEquationSystem = input.xEquationSystem;
        this.yEquationSystem = input.yEquationSystem;
    }

    public isValid(): boolean {
        return (
            FitSpline2ConstraintSystem.hasValidCounts(this.controlPointCount, this.fitPointCount) &&
            this.xEquationSystem.size === this.controlPointCount &&
            this.yEquationSystem.size === this.controlPointCount &&
            this.xEquationSystem.isValid() &&
            this.yEquationSystem.isValid()
        );
    }

    public static create(input: {
        readonly coefficientMatrix: readonly (readonly number[])[];
        readonly controlPointCount: number;
        readonly fitPointCount: number;
        readonly xValues: readonly number[];
        readonly yValues: readonly number[];
    }): GeometryResult<FitSpline2ConstraintSystem> {
        if (
            !FitSpline2ConstraintSystem.hasValidCounts(input.controlPointCount, input.fitPointCount)
        ) {
            return GeometryResult.degenerate();
        }

        const xEquationSystem = LinearEquationSystem.create({
            coefficientMatrix: input.coefficientMatrix,
            rightHandSide: input.xValues,
        });
        const yEquationSystem = LinearEquationSystem.create({
            coefficientMatrix: input.coefficientMatrix,
            rightHandSide: input.yValues,
        });

        if (!xEquationSystem.success || !xEquationSystem.value) {
            return GeometryResult.degenerate();
        }

        if (!yEquationSystem.success || !yEquationSystem.value) {
            return GeometryResult.degenerate();
        }

        const system = new FitSpline2ConstraintSystem({
            controlPointCount: input.controlPointCount,
            fitPointCount: input.fitPointCount,
            xEquationSystem: xEquationSystem.value,
            yEquationSystem: yEquationSystem.value,
        });

        return system.isValid()
            ? GeometryResult.success(
                  system,
                  new ImmutableResultPayloadSnapshotter<FitSpline2ConstraintSystem>(),
              )
            : GeometryResult.degenerate();
    }

    private static hasValidCounts(controlPointCount: number, fitPointCount: number): boolean {
        return (
            Number.isInteger(fitPointCount) &&
            fitPointCount >= 3 &&
            Number.isInteger(controlPointCount) &&
            controlPointCount === fitPointCount + 2
        );
    }
}
