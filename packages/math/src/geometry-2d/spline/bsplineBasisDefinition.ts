import type { ParameterDomain } from '../parameterDomain';
import { BSplineKnotVector } from './bsplineKnotVector';

export interface BSplineBasisDefinitionInput {
    readonly controlPointCount: number;
    readonly degree: number;
    readonly knotVector: BSplineKnotVector;
}

export class BSplineBasisDefinition {
    public readonly controlPointCount: number;
    public readonly degree: number;
    public readonly domain: ParameterDomain;
    public readonly knotVector: BSplineKnotVector;

    constructor(input: BSplineBasisDefinitionInput) {
        this.controlPointCount = input.controlPointCount;
        this.degree = input.degree;
        this.knotVector = new BSplineKnotVector(input.knotVector.values);
        this.domain = this.knotVector.resolveDomain(this.degree, this.controlPointCount);
    }

    public isValid(): boolean {
        return (
            Number.isInteger(this.controlPointCount) &&
            Number.isInteger(this.degree) &&
            this.degree >= 1 &&
            this.controlPointCount > this.degree &&
            this.knotVector.length === this.controlPointCount + this.degree + 1 &&
            this.knotVector.isFiniteNonDecreasing() &&
            this.domain.length > 0
        );
    }

    public clampParameter(parameter: number): number {
        if (parameter >= this.domain.max) {
            return this.domain.max;
        }

        return this.domain.clamp(parameter);
    }
}
