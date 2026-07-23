import { GeometryResult } from '../../value/result';

export class FitSpline2ParameterSet {
    private readonly valueSnapshot: readonly number[];

    private constructor(values: readonly number[]) {
        this.valueSnapshot = [...values];
    }

    public get count(): number {
        return this.valueSnapshot.length;
    }

    public get values(): readonly number[] {
        return [...this.valueSnapshot];
    }

    public get end(): number | undefined {
        return this.valueSnapshot.at(-1);
    }

    public get start(): number | undefined {
        return this.valueSnapshot[0];
    }

    public valueAt(index: number): number | undefined {
        return this.valueSnapshot[index];
    }

    public isValid(): boolean {
        if (this.valueSnapshot.length < 3 || this.start !== 0 || this.end !== 1) {
            return false;
        }

        let previous = this.start;

        for (let index = 1; index < this.valueSnapshot.length; index += 1) {
            const current = this.valueSnapshot.at(index);

            if (current === undefined || !Number.isFinite(current) || current <= previous) {
                return false;
            }

            previous = current;
        }

        return Number.isFinite(previous);
    }

    public static create(values: readonly number[]): GeometryResult<FitSpline2ParameterSet> {
        const parameterSet = new FitSpline2ParameterSet(values);

        return parameterSet.isValid()
            ? GeometryResult.success(parameterSet)
            : GeometryResult.degenerate();
    }
}
