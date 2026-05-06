import { Vec2, type Vector2 } from '../linear/vec2';
import type { BoundedCurve2 } from './curve';
import { ParameterDomain } from './parameter';

export class BSpline2 implements BoundedCurve2 {
    public readonly controlPoints: readonly Vec2[];
    public readonly degree: number;
    public readonly domain: ParameterDomain;
    public readonly knots: readonly number[];

    constructor(input: {
        readonly controlPoints: readonly Vector2[];
        readonly degree: number;
        readonly knots: readonly number[];
    }) {
        this.controlPoints = input.controlPoints.map((point) => Vec2.from(point));
        this.degree = input.degree;
        this.knots = [...input.knots];
        this.domain = resolveBSplineDomain(this.controlPoints.length, this.degree, this.knots);
    }

    public pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return this.controlPoints[0] ?? Vec2.zero();
        }

        return this.basisValues(parameter).reduce(
            (point, basis, index) =>
                point.translated((this.controlPoints[index] ?? Vec2.zero()).scale(basis)),
            Vec2.zero(),
        );
    }

    public tangentAt(parameter: number): Vec2 {
        return finiteDifferenceTangent(this, parameter);
    }

    public isValid(): boolean {
        return (
            Number.isInteger(this.degree) &&
            this.degree >= 1 &&
            this.controlPoints.length > this.degree &&
            this.controlPoints.every((point) => point.isFinite()) &&
            this.knots.length === this.controlPoints.length + this.degree + 1 &&
            this.knots.every(Number.isFinite) &&
            isNonDecreasing(this.knots) &&
            this.domain.length > 0
        );
    }

    protected basisValues(parameter: number): readonly number[] {
        const parameterValue = clampParameterToDomain(parameter, this.domain);

        return this.controlPoints.map((_, index) =>
            basisValue(index, this.degree, parameterValue, this.knots, this.domain.max),
        );
    }
}

export class Nurbs2 extends BSpline2 {
    public readonly weights: readonly number[];

    constructor(input: {
        readonly controlPoints: readonly Vector2[];
        readonly degree: number;
        readonly knots: readonly number[];
        readonly weights: readonly number[];
    }) {
        super(input);
        this.weights = [...input.weights];
    }

    public override pointAt(parameter: number): Vec2 {
        if (!this.isValid()) {
            return this.controlPoints[0] ?? Vec2.zero();
        }

        const basisValues = this.basisValues(parameter);
        let denominator = 0;
        let numerator = Vec2.zero();

        for (let index = 0; index < this.controlPoints.length; index += 1) {
            const weight = this.weights[index] ?? 0;
            const weightedBasis = (basisValues[index] ?? 0) * weight;
            const point = this.controlPoints[index];

            if (!point) {
                continue;
            }

            denominator += weightedBasis;
            numerator = numerator.translated(point.scale(weightedBasis));
        }

        return Math.abs(denominator) <= 1e-12 ? Vec2.zero() : numerator.scale(1 / denominator);
    }

    public override isValid(): boolean {
        return (
            super.isValid() &&
            this.weights.length === this.controlPoints.length &&
            this.weights.every((weight) => Number.isFinite(weight) && weight > 0)
        );
    }
}

function resolveBSplineDomain(
    controlPointCount: number,
    degree: number,
    knots: readonly number[],
): ParameterDomain {
    const min = knots[degree];
    const max = knots[controlPointCount];

    return min !== undefined && max !== undefined && Number.isFinite(min) && Number.isFinite(max)
        ? new ParameterDomain(min, max)
        : ParameterDomain.unit();
}

function clampParameterToDomain(parameter: number, domain: ParameterDomain): number {
    if (parameter >= domain.max) {
        return domain.max;
    }

    return domain.clamp(parameter);
}

function basisValue(
    index: number,
    degree: number,
    parameter: number,
    knots: readonly number[],
    domainMax: number,
): number {
    const knot = knots[index] ?? 0;
    const nextKnot = knots[index + 1] ?? 0;

    if (degree === 0) {
        return (knot <= parameter && parameter < nextKnot) ||
            (parameter === domainMax && parameter === nextKnot)
            ? 1
            : 0;
    }

    const leftDenominator = (knots[index + degree] ?? 0) - knot;
    const rightDenominator = (knots[index + degree + 1] ?? 0) - nextKnot;
    const left =
        Math.abs(leftDenominator) <= 1e-12
            ? 0
            : ((parameter - knot) / leftDenominator) *
              basisValue(index, degree - 1, parameter, knots, domainMax);
    const right =
        Math.abs(rightDenominator) <= 1e-12
            ? 0
            : (((knots[index + degree + 1] ?? 0) - parameter) / rightDenominator) *
              basisValue(index + 1, degree - 1, parameter, knots, domainMax);

    return left + right;
}

function finiteDifferenceTangent(curve: BoundedCurve2, parameter: number): Vec2 {
    const span = Math.max(curve.domain.length, 1);
    const delta = span * 1e-5;
    const before = curve.domain.clamp(parameter - delta);
    const after = curve.domain.clamp(parameter + delta);

    if (after === before) {
        return Vec2.zero();
    }

    return curve.pointAt(before).vectorTo(curve.pointAt(after)).normalize();
}

function isNonDecreasing(values: readonly number[]): boolean {
    return values.every((value, index) => index === 0 || value >= (values[index - 1] ?? value));
}
