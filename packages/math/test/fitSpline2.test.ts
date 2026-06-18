import { FitSpline2, Vec2, type Vector2 } from '../src';

const ON_SHAPE_TOLERANCE = 1e-12;

run('FitSpline2 matches Onshape interpolated spline handles for extracted feature data', () => {
    const fitPoints = toPoints([
        -0.47854803585631334, -0.07876318991913167, -0.43480502846818175, -0.03059442785984179,
        -0.3910619203609201, -0.06444389274106394, -0.34731887720078936, -0.016275134440738914,
    ]);
    const spline = FitSpline2.fromFitPoints({
        endTangent: Vec2.of(0.12411508691927275, 0.22563082449997024),
        fitPoints,
        startTangent: Vec2.of(0.1241149860834165, 0.22563085756466375),
    }).value;

    if (!spline) {
        throw new Error('Expected Onshape fixture to create a fit spline.');
    }

    const naturalSpline = FitSpline2.fromFitPoints({ fitPoints }).value;

    if (!naturalSpline) {
        throw new Error('Expected Onshape fixture to create a natural fit spline.');
    }

    expectOnshapeSplineHandles(spline, fitPoints);
    expectOnshapeSplineHandles(naturalSpline, fitPoints);

    for (let index = 0; index < fitPoints.length; index += 1) {
        expectPoint(
            spline.pointAt(spline.fitParameters[index] ?? 0),
            fitPoints[index],
            `expected spline to interpolate fit point ${String(index)}`,
        );
        expectPoint(
            naturalSpline.pointAt(naturalSpline.fitParameters[index] ?? 0),
            fitPoints[index],
            `expected natural spline to interpolate fit point ${String(index)}`,
        );
    }
});

function expectOnshapeSplineHandles(spline: FitSpline2, fitPoints: readonly Vector2[]): void {
    const controlPoints = spline.basisCurve.controlPoints;

    expectPoint(controlPoints[0], fitPoints[0], 'expected first control point');
    expectPoint(
        controlPoints[1],
        Vec2.of(-0.46438928655817124, -0.0530237458198044),
        'expected Onshape start handle',
    );
    expectPoint(
        controlPoints[controlPoints.length - 2],
        Vec2.of(-0.3614776403158335, -0.04201457897438417),
        'expected Onshape end handle',
    );
    expectPoint(
        controlPoints[controlPoints.length - 1],
        fitPoints[fitPoints.length - 1],
        'expected last control point',
    );
}

run('FitSpline2 rejects invalid fit point inputs', () => {
    expectEqual(FitSpline2.fromFitPoints({ fitPoints: [] }).status, 'empty', 'expected empty');
    expectEqual(
        FitSpline2.fromFitPoints({
            fitPoints: [Vec2.of(0, 0), Vec2.of(1, 1)],
        }).status,
        'empty',
        'expected less than three points to be empty',
    );
    expectEqual(
        FitSpline2.fromFitPoints({
            fitPoints: [Vec2.of(0, 0), Vec2.of(0, 0), Vec2.of(0, 0)],
        }).status,
        'degenerate',
        'expected repeated points to be degenerate',
    );
});

function toPoints(values: readonly number[]): readonly Vec2[] {
    const points: Vec2[] = [];

    for (let index = 0; index < values.length; index += 2) {
        points.push(Vec2.of(values[index] ?? 0, values[index + 1] ?? 0));
    }

    return points;
}

function run(name: string, test: () => void): void {
    test();
    console.log(`ok - ${name}`);
}

function expectPoint(
    actual: Vector2 | null | undefined,
    expected: Vector2 | null | undefined,
    message: string,
): void {
    if (!actual || !expected || Vec2.distance(actual, expected) > ON_SHAPE_TOLERANCE) {
        throw new Error(
            `${message}: expected (${String(expected?.x)}, ${String(expected?.y)}), received ${actual ? `(${String(actual.x)}, ${String(actual.y)})` : 'null'}`,
        );
    }
}

function expectEqual<TValue>(actual: TValue, expected: TValue, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
    }
}
