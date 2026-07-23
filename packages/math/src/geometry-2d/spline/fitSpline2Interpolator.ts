import { Vec2 } from '../../linear/vec2';
import { GaussianEliminationSolver } from '../../linear/gaussianEliminationSolver';
import { GeometryResult } from '../../value/result';
import { BSpline2 } from '../bspline2';
import { BSplineBasisDefinition } from './bsplineBasisDefinition';
import { FitSpline2ConstraintSystemBuilder } from './fitSpline2ConstraintSystemBuilder';
import { FitSpline2InputValidator } from './fitSpline2InputValidator';
import { FitSpline2Interpolation } from './fitSpline2Interpolation';
import { FitSpline2KnotVectorFactory } from './fitSpline2KnotVectorFactory';
import { FitSpline2Parameterizer } from './fitSpline2Parameterizer';
import type { GeometryResultStatus } from '../../value/result';
import type { Tolerance } from '../../value/tolerance';
import type { FitSpline2Input } from './fitSpline2Specification';

export class FitSpline2Interpolator {
    private readonly constraintSystemBuilder: FitSpline2ConstraintSystemBuilder;
    private readonly inputValidator: FitSpline2InputValidator;
    private readonly knotVectorFactory: FitSpline2KnotVectorFactory;
    private readonly parameterizer: FitSpline2Parameterizer;
    private readonly solver: GaussianEliminationSolver;

    constructor(tolerance: Tolerance) {
        this.constraintSystemBuilder = new FitSpline2ConstraintSystemBuilder(tolerance);
        this.inputValidator = new FitSpline2InputValidator(tolerance);
        this.knotVectorFactory = new FitSpline2KnotVectorFactory();
        this.parameterizer = new FitSpline2Parameterizer(tolerance);
        this.solver = new GaussianEliminationSolver(tolerance);
    }

    public interpolate(input: FitSpline2Input): GeometryResult<FitSpline2Interpolation> {
        const specificationResult = this.inputValidator.validate(input);

        if (!specificationResult.success || !specificationResult.value) {
            return this.failureFor(specificationResult.status);
        }

        const specification = specificationResult.value;
        const parameterSetResult = this.parameterizer.parameterize(specification);

        if (!parameterSetResult.success || !parameterSetResult.value) {
            return this.failureFor(parameterSetResult.status);
        }

        const parameterSet = parameterSetResult.value;
        const knotVectorResult = this.knotVectorFactory.create(specification, parameterSet);

        if (!knotVectorResult.success || !knotVectorResult.value) {
            return this.failureFor(knotVectorResult.status);
        }

        const basisDefinition = new BSplineBasisDefinition({
            controlPointCount: specification.controlPointCount,
            degree: specification.degree,
            knotVector: knotVectorResult.value,
        });

        if (!basisDefinition.isValid()) {
            return GeometryResult.degenerate();
        }

        const constraintSystemResult = this.constraintSystemBuilder.build(
            specification,
            parameterSet,
            basisDefinition,
        );

        if (!constraintSystemResult.success || !constraintSystemResult.value) {
            return this.failureFor(constraintSystemResult.status);
        }

        const constraintSystem = constraintSystemResult.value;
        const xResult = this.solver.solve(constraintSystem.xEquationSystem);
        const yResult = this.solver.solve(constraintSystem.yEquationSystem);

        if (!xResult.success || !xResult.value || !yResult.success || !yResult.value) {
            return GeometryResult.degenerate();
        }

        const controlPoints = this.createControlPoints(
            xResult.value,
            yResult.value,
            specification.controlPointCount,
        );

        if (!controlPoints) {
            return GeometryResult.degenerate();
        }

        const basisCurve = new BSpline2({
            controlPoints,
            degree: specification.degree,
            knots: knotVectorResult.value.values,
        });

        if (!basisCurve.isValid()) {
            return GeometryResult.degenerate();
        }

        return GeometryResult.success(
            new FitSpline2Interpolation({
                basisCurve,
                parameterSet,
                specification,
            }),
        );
    }

    private createControlPoints(
        xValues: readonly number[],
        yValues: readonly number[],
        controlPointCount: number,
    ): readonly Vec2[] | null {
        if (xValues.length !== controlPointCount || yValues.length !== controlPointCount) {
            return null;
        }

        const controlPoints: Vec2[] = [];

        for (let index = 0; index < controlPointCount; index += 1) {
            const x = xValues[index];
            const y = yValues[index];

            if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
                return null;
            }

            controlPoints.push(Vec2.of(x, y));
        }

        return controlPoints;
    }

    private failureFor<TValue>(status: GeometryResultStatus): GeometryResult<TValue> {
        if (status === 'empty') {
            return GeometryResult.empty();
        }

        return GeometryResult.degenerate();
    }
}
