import { Vec2, type Vector2 } from '../linear/vec2';
import { GeometryResult } from '../value/result';
import { DEFAULT_TOLERANCE } from '../value/tolerance';
import { BSpline2 } from './bspline2';
import { Curve2 } from './curve';
import type { ParameterDomain } from './parameter';

export type FitSplineParameterization = 'centripetal' | 'chord-length' | 'uniform';

export interface FitSpline2Input {
    readonly closed?: boolean;
    readonly degree?: number;
    readonly endTangent?: Vector2 | undefined;
    readonly fitPoints: readonly Vector2[];
    readonly parameterization?: FitSplineParameterization;
    readonly startTangent?: Vector2 | undefined;
}

export class FitSpline2 extends Curve2 {
    public readonly basisCurve: BSpline2;
    public readonly closed: boolean;
    public readonly degree: number;
    public readonly domain: ParameterDomain;
    public readonly endTangent: Vec2 | null;
    public readonly fitParameters: readonly number[];
    public readonly fitPoints: readonly Vec2[];
    public readonly parameterization: FitSplineParameterization;
    public readonly startTangent: Vec2 | null;

    private constructor(input: {
        readonly basisCurve: BSpline2;
        readonly closed: boolean;
        readonly degree: number;
        readonly endTangent: Vec2 | null;
        readonly fitParameters: readonly number[];
        readonly fitPoints: readonly Vec2[];
        readonly parameterization: FitSplineParameterization;
        readonly startTangent: Vec2 | null;
    }) {
        super();
        this.basisCurve = input.basisCurve;
        this.closed = input.closed;
        this.degree = input.degree;
        this.domain = input.basisCurve.domain;
        this.endTangent = input.endTangent;
        this.fitParameters = [...input.fitParameters];
        this.fitPoints = [...input.fitPoints];
        this.parameterization = input.parameterization;
        this.startTangent = input.startTangent;
    }

    public pointAt(parameter: number): Vec2 {
        return this.basisCurve.pointAt(parameter);
    }

    public tangentAt(parameter: number): Vec2 {
        return this.basisCurve.tangentAt(parameter);
    }

    public isValid(): boolean {
        return this.basisCurve.isValid() && this.fitPoints.length >= 3;
    }

    public static fromFitPoints(input: FitSpline2Input): GeometryResult<FitSpline2> {
        const fitPoints = input.fitPoints.map((point) => Vec2.from(point));

        if (fitPoints.length < 3) {
            return GeometryResult.empty();
        }

        if (
            !fitPoints.every((point) => point.isFinite()) ||
            !isOptionalFiniteVector(input.startTangent) ||
            !isOptionalFiniteVector(input.endTangent)
        ) {
            return GeometryResult.empty();
        }

        if (!hasUsablePointSpan(fitPoints)) {
            return GeometryResult.degenerate();
        }

        const degree = resolveDegree(input.degree);
        const parameterization = input.parameterization ?? 'centripetal';
        const fitParameters = createFitParameters(fitPoints, parameterization);

        if (!fitParameters) {
            return GeometryResult.degenerate();
        }

        const controlPointCount = fitPoints.length + 2;
        const knots = createInterpolationKnots(fitParameters, degree, controlPointCount);
        const constraints = createInterpolationConstraints({
            controlPointCount,
            degree,
            endDerivative: input.endTangent ? Vec2.from(input.endTangent) : null,
            fitParameters,
            fitPoints,
            knots,
            startDerivative: input.startTangent ? Vec2.from(input.startTangent) : null,
        });
        const x = solveLinearSystem(
            constraints.matrix,
            constraints.values.map((point) => point.x),
        );
        const y = solveLinearSystem(
            constraints.matrix,
            constraints.values.map((point) => point.y),
        );

        if (!x || !y) {
            return GeometryResult.degenerate();
        }

        const controlPoints = x.map((value, index) => Vec2.of(value, y[index] ?? 0));

        if (!controlPoints.every((point) => point.isFinite())) {
            return GeometryResult.degenerate();
        }

        const basisCurve = new BSpline2({
            controlPoints,
            degree,
            knots,
        });

        if (!basisCurve.isValid()) {
            return GeometryResult.degenerate();
        }

        return GeometryResult.success(
            new FitSpline2({
                basisCurve,
                closed: input.closed ?? false,
                degree,
                endTangent: input.endTangent ? Vec2.from(input.endTangent) : null,
                fitParameters,
                fitPoints,
                parameterization,
                startTangent: input.startTangent ? Vec2.from(input.startTangent) : null,
            }),
        );
    }
}

function resolveDegree(degree: number | undefined): number {
    const requested = Number.isInteger(degree) ? Math.floor(degree ?? 3) : 3;

    return requested === 3 ? 3 : 3;
}

function createFitParameters(
    points: readonly Vec2[],
    parameterization: FitSplineParameterization,
): readonly number[] | null {
    if (parameterization === 'uniform') {
        const denominator = points.length - 1;

        return points.map((_, index) => index / denominator);
    }

    const cumulative = [0];
    let total = 0;

    for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];

        if (!previous || !current) {
            return null;
        }

        const distance = previous.distanceTo(current);
        const step = parameterization === 'centripetal' ? Math.sqrt(distance) : distance;

        if (!Number.isFinite(step) || step <= DEFAULT_TOLERANCE.distance) {
            return null;
        }

        total += step;
        cumulative.push(total);
    }

    if (!Number.isFinite(total) || total <= DEFAULT_TOLERANCE.distance) {
        return null;
    }

    return cumulative.map((value) => value / total);
}

function createInterpolationKnots(
    parameters: readonly number[],
    degree: number,
    controlPointCount: number,
): readonly number[] {
    const knotCount = controlPointCount + degree + 1;
    const knots = Array<number>(knotCount).fill(0);

    for (let index = controlPointCount; index < knotCount; index += 1) {
        knots[index] = 1;
    }

    for (let index = 1; index < parameters.length - 1; index += 1) {
        knots[index + degree] = parameters[index] ?? 0;
    }

    return knots;
}

function createInterpolationConstraints(input: {
    readonly controlPointCount: number;
    readonly degree: number;
    readonly endDerivative: Vec2 | null;
    readonly fitParameters: readonly number[];
    readonly fitPoints: readonly Vec2[];
    readonly knots: readonly number[];
    readonly startDerivative: Vec2 | null;
}): {
    readonly matrix: readonly (readonly number[])[];
    readonly values: readonly Vec2[];
} {
    const domainMax = input.fitParameters.at(-1) ?? 1;
    const matrix = input.fitParameters.map((parameter) =>
        basisRow(input.controlPointCount, input.degree, parameter, input.knots, domainMax, 0),
    );
    const values = [...input.fitPoints];
    const startParameter = input.fitParameters[0] ?? 0;
    const endParameter = domainMax;

    matrix.push(
        basisRow(
            input.controlPointCount,
            input.degree,
            startParameter,
            input.knots,
            domainMax,
            input.startDerivative ? 1 : 2,
        ),
    );
    values.push(input.startDerivative ?? Vec2.zero());
    matrix.push(
        basisRow(
            input.controlPointCount,
            input.degree,
            endParameter,
            input.knots,
            domainMax,
            input.endDerivative ? 1 : 2,
        ),
    );
    values.push(input.endDerivative ?? Vec2.zero());

    return {
        matrix,
        values,
    };
}

function basisRow(
    controlPointCount: number,
    degree: number,
    parameter: number,
    knots: readonly number[],
    domainMax: number,
    derivativeOrder: 0 | 1 | 2,
): readonly number[] {
    return Array.from({ length: controlPointCount }, (_, index) => {
        if (derivativeOrder === 1) {
            return basisDerivativeValue(index, degree, parameter, knots, domainMax);
        }

        if (derivativeOrder === 2) {
            return basisSecondDerivativeValue(index, degree, parameter, knots, domainMax);
        }

        return basisValue(index, degree, parameter, knots, domainMax);
    });
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
    const left = DEFAULT_TOLERANCE.isNearZeroParameter(leftDenominator)
        ? 0
        : ((parameter - knot) / leftDenominator) *
          basisValue(index, degree - 1, parameter, knots, domainMax);
    const right = DEFAULT_TOLERANCE.isNearZeroParameter(rightDenominator)
        ? 0
        : (((knots[index + degree + 1] ?? 0) - parameter) / rightDenominator) *
          basisValue(index + 1, degree - 1, parameter, knots, domainMax);

    return left + right;
}

function basisDerivativeValue(
    index: number,
    degree: number,
    parameter: number,
    knots: readonly number[],
    domainMax: number,
): number {
    if (degree <= 0) {
        return 0;
    }

    const leftDenominator = (knots[index + degree] ?? 0) - (knots[index] ?? 0);
    const rightDenominator = (knots[index + degree + 1] ?? 0) - (knots[index + 1] ?? 0);
    const left = DEFAULT_TOLERANCE.isNearZeroParameter(leftDenominator)
        ? 0
        : (degree / leftDenominator) * basisValue(index, degree - 1, parameter, knots, domainMax);
    const right = DEFAULT_TOLERANCE.isNearZeroParameter(rightDenominator)
        ? 0
        : (degree / rightDenominator) *
          basisValue(index + 1, degree - 1, parameter, knots, domainMax);

    return left - right;
}

function basisSecondDerivativeValue(
    index: number,
    degree: number,
    parameter: number,
    knots: readonly number[],
    domainMax: number,
): number {
    if (degree <= 1) {
        return 0;
    }

    const leftDenominator = (knots[index + degree] ?? 0) - (knots[index] ?? 0);
    const rightDenominator = (knots[index + degree + 1] ?? 0) - (knots[index + 1] ?? 0);
    const left = DEFAULT_TOLERANCE.isNearZeroParameter(leftDenominator)
        ? 0
        : (degree / leftDenominator) *
          basisDerivativeValue(index, degree - 1, parameter, knots, domainMax);
    const right = DEFAULT_TOLERANCE.isNearZeroParameter(rightDenominator)
        ? 0
        : (degree / rightDenominator) *
          basisDerivativeValue(index + 1, degree - 1, parameter, knots, domainMax);

    return left - right;
}

function solveLinearSystem(
    coefficientMatrix: readonly (readonly number[])[],
    values: readonly number[],
): readonly number[] | null {
    const size = values.length;
    const matrix = coefficientMatrix.map((row, index) => [...row, values[index] ?? 0]);

    for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
        let pivotRow = pivotIndex;
        let pivotMagnitude = Math.abs(matrix[pivotRow]?.[pivotIndex] ?? 0);

        for (let row = pivotIndex + 1; row < size; row += 1) {
            const magnitude = Math.abs(matrix[row]?.[pivotIndex] ?? 0);

            if (magnitude > pivotMagnitude) {
                pivotMagnitude = magnitude;
                pivotRow = row;
            }
        }

        if (pivotMagnitude <= DEFAULT_TOLERANCE.parameter) {
            return null;
        }

        if (pivotRow !== pivotIndex) {
            const current = matrix[pivotIndex];
            const pivot = matrix[pivotRow];

            if (!current || !pivot) {
                return null;
            }

            matrix[pivotIndex] = pivot;
            matrix[pivotRow] = current;
        }

        const pivotValue = matrix[pivotIndex]?.[pivotIndex] ?? 0;

        for (let column = pivotIndex; column <= size; column += 1) {
            const row = matrix[pivotIndex];

            if (!row) {
                return null;
            }

            row[column] = (row[column] ?? 0) / pivotValue;
        }

        for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
            if (rowIndex === pivotIndex) {
                continue;
            }

            const row = matrix[rowIndex];
            const pivotRowValues = matrix[pivotIndex];
            const factor = row?.[pivotIndex] ?? 0;

            if (!row || !pivotRowValues) {
                return null;
            }

            for (let column = pivotIndex; column <= size; column += 1) {
                row[column] = (row[column] ?? 0) - factor * (pivotRowValues[column] ?? 0);
            }
        }
    }

    const result = matrix.map((row) => row[size] ?? Number.NaN);

    return result.every(Number.isFinite) ? result : null;
}

function hasUsablePointSpan(points: readonly Vec2[]): boolean {
    return points.some(
        (point, index) =>
            index > 0 && point.distanceTo(points[0] ?? point) > DEFAULT_TOLERANCE.distance,
    );
}

function isOptionalFiniteVector(vector: Vector2 | undefined): boolean {
    return !vector || (Number.isFinite(vector.x) && Number.isFinite(vector.y));
}
