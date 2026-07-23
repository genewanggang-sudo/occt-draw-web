import { ParameterDomain } from '../parameterDomain';

export class BSplineKnotVector {
    private readonly valueSnapshot: readonly number[];

    constructor(values: readonly number[]) {
        this.valueSnapshot = [...values];
    }

    public get length(): number {
        return this.valueSnapshot.length;
    }

    public get values(): readonly number[] {
        return [...this.valueSnapshot];
    }

    public valueAt(index: number): number | undefined {
        return this.valueSnapshot[index];
    }

    public isFiniteNonDecreasing(): boolean {
        for (let index = 0; index < this.valueSnapshot.length; index += 1) {
            const value = this.valueSnapshot[index];
            const previous = index > 0 ? this.valueSnapshot[index - 1] : undefined;

            if (
                value === undefined ||
                !Number.isFinite(value) ||
                (previous !== undefined && value < previous)
            ) {
                return false;
            }
        }

        return true;
    }

    public resolveDomain(degree: number, controlPointCount: number): ParameterDomain {
        const min = this.valueSnapshot[degree];
        const max = this.valueSnapshot[controlPointCount];

        return min !== undefined &&
            max !== undefined &&
            Number.isFinite(min) &&
            Number.isFinite(max)
            ? new ParameterDomain(min, max)
            : ParameterDomain.unit();
    }
}
