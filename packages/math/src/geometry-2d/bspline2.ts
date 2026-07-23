import { Vec2, type Vector2 } from '../linear/vec2';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { Curve2 } from './curve';
import { BSplineBasisEvaluator } from './spline/bsplineBasisEvaluator';
import { BSplineDefinition2 } from './spline/bsplineDefinition2';
import type { ParameterDomain } from './parameterDomain';

export class BSpline2 extends Curve2 {
    private readonly basisEvaluator: BSplineBasisEvaluator;
    private readonly controlPointSnapshot: readonly Vec2[];
    private readonly definition: BSplineDefinition2;
    private readonly knotSnapshot: readonly number[];

    public readonly degree: number;
    public readonly domain: ParameterDomain;

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
        this.controlPointSnapshot = this.definition.controlPoints;
        this.degree = this.definition.basisDefinition.degree;
        this.domain = this.definition.basisDefinition.domain;
        this.knotSnapshot = this.definition.basisDefinition.knotVector.values;
    }

    public get controlPoints(): readonly Vec2[] {
        return this.controlPointSnapshot.map((point) => Vec2.from(point));
    }

    public get knots(): readonly number[] {
        return [...this.knotSnapshot];
    }

    public pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return Vec2.zero();
        }

        const basisValues = this.basisValues(parameter);
        let point = Vec2.zero();

        for (let index = 0; index < this.controlPointSnapshot.length; index += 1) {
            const controlPoint = this.controlPointSnapshot[index];
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

    protected get controlPointCount(): number {
        return this.controlPointSnapshot.length;
    }

    protected controlPointAt(index: number): Vec2 | undefined {
        const point = this.controlPointSnapshot[index];

        return point ? Vec2.from(point) : undefined;
    }
}
