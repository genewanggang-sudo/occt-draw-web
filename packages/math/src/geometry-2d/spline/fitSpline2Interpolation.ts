import type { BSpline2 } from '../bspline2';
import type { FitSpline2ParameterSet } from './fitSpline2ParameterSet';
import type { FitSpline2Specification } from './fitSpline2Specification';

export class FitSpline2Interpolation {
    public readonly basisCurve: BSpline2;
    public readonly parameterSet: FitSpline2ParameterSet;
    public readonly specification: FitSpline2Specification;

    constructor(input: {
        readonly basisCurve: BSpline2;
        readonly parameterSet: FitSpline2ParameterSet;
        readonly specification: FitSpline2Specification;
    }) {
        this.basisCurve = input.basisCurve;
        this.parameterSet = input.parameterSet;
        this.specification = input.specification;
    }
}
