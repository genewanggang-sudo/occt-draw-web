import { Vec2, type Vector2 } from '../linear/vec2';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { Curve2 } from './curve';
import { BSplineBasisEvaluator } from './spline/bsplineBasisEvaluator';
import { BSplineDefinition2 } from './spline/bsplineDefinition2';
import type { ParameterDomain } from './parameterDomain';

export class BSpline2 extends Curve2 {
    private readonly basisEvaluator: BSplineBasisEvaluator;
    private readonly definition: BSplineDefinition2;

    public readonly controlPoints: readonly Vec2[];
    public readonly degree: number;
    public readonly domain: ParameterDomain;
    public readonly knots: readonly number[];

    constructor(input: {
        readonly controlPoints: readonly Vector2[];
        readonly degree: number;
        readonly knots: readonly number[];
    }) {
        super();
        this.definition = new BSplineDefinition2(input);
        this.basisEvaluator = new BSplineBasisEvaluator(
            this.definition.basisDefinition,
            DEFAULT_TOLERANCE,
        );
        this.controlPoints = this.definition.controlPoints;
        this.degree = this.definition.basisDefinition.degree;
        this.domain = this.definition.basisDefinition.domain;
        this.knots = [...this.definition.basisDefinition.knotVector.values];
    }

    public pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return Vec2.zero();
        }

        const basisValues = this.basisValues(parameter);
        let point = Vec2.zero();

        for (let index = 0; index < this.controlPoints.length; index += 1) {
            const controlPoint = this.controlPoints[index];
            const basisValue = basisValues[index];

            if (!controlPoint || basisValue === undefined) {
                return Vec2.zero();
            }

            point = point.translated(controlPoint.scale(basisValue));
        }

        return point;
    }

    public tangentAt(parameter: number): Vec2 {
        return this.finiteDifferenceTangent(parameter);
    }

    public isValid(): boolean {
        return this.definition.isValid();
    }

    protected basisValues(parameter: number): readonly number[] {
        return this.basisEvaluator.basisValuesAt(parameter);
    }
}
