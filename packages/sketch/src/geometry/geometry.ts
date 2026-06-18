import {
    BaseModelElement,
    defineModelProperty,
    type ModelPropertyDefinition,
    type ModelPropertyValue,
} from '@occt-draw/core';
import {
    Angle,
    Arc2,
    Circle2,
    Conic2,
    Coord2,
    Ellipse2,
    EllipticalArc2,
    FitSpline2,
    Vec2,
    type FitSplineParameterization,
    type Vector2,
} from '@occt-draw/math';
import { recordSketchPropertySet } from '../changes/changeTracking';
import {
    SketchEntityKind,
    type Arc2DSnapshot,
    type Circle2DSnapshot,
    type Conic2DSnapshot,
    type Curve2DSnapshot,
    type Ellipse2DSnapshot,
    type EllipticalArc2DSnapshot,
    type Line2DSnapshot,
    type Point2DSnapshot,
    type SketchCurveId,
    type SketchEntityRef,
    type SketchId,
    type SketchPointId,
    type Spline2DSnapshot,
} from '../types';

const POINT_POSITION_PROPERTY = defineModelProperty<Vector2>({
    key: 'position',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const LINE_DIRECTION_PROPERTY = defineModelProperty<Vector2>({
    key: 'direction',
    defaultValue: Vec2.of(1, 0),
    validate: assertVector2Property,
});

const LINE_ORIGIN_PROPERTY = defineModelProperty<Vector2>({
    key: 'origin',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const CIRCLE_CENTER_PROPERTY = defineModelProperty<Vector2>({
    key: 'center',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const CIRCLE_RADIUS_PROPERTY = defineModelProperty<number>({
    key: 'radius',
    defaultValue: 0,
});

const ELLIPSE_CENTER_PROPERTY = defineModelProperty<Vector2>({
    key: 'center',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const ELLIPSE_X_AXIS_PROPERTY = defineModelProperty<Vector2>({
    key: 'xAxis',
    defaultValue: Vec2.of(1, 0),
    validate: assertVector2Property,
});

const ELLIPSE_Y_AXIS_PROPERTY = defineModelProperty<Vector2>({
    key: 'yAxis',
    defaultValue: Vec2.of(0, 1),
    validate: assertVector2Property,
});

const ELLIPSE_MAJOR_RADIUS_PROPERTY = defineModelProperty<number>({
    key: 'majorRadius',
    defaultValue: 0,
});

const ELLIPSE_MINOR_RADIUS_PROPERTY = defineModelProperty<number>({
    key: 'minorRadius',
    defaultValue: 0,
});

const ARC_CENTER_PROPERTY = defineModelProperty<Vector2>({
    key: 'center',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const ARC_END_ANGLE_PROPERTY = defineModelProperty<number>({
    key: 'endAngleRadians',
    defaultValue: 0,
});

const ARC_RADIUS_PROPERTY = defineModelProperty<number>({
    key: 'radius',
    defaultValue: 0,
});

const ARC_START_ANGLE_PROPERTY = defineModelProperty<number>({
    key: 'startAngleRadians',
    defaultValue: 0,
});

const CONIC_START_POINT_PROPERTY = defineModelProperty<Vector2>({
    key: 'startPoint',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const CONIC_END_POINT_PROPERTY = defineModelProperty<Vector2>({
    key: 'endPoint',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const CONIC_SHOULDER_POINT_PROPERTY = defineModelProperty<Vector2>({
    key: 'shoulderPoint',
    defaultValue: Vec2.of(0, 0),
    validate: assertVector2Property,
});

const CONIC_RHO_PROPERTY = defineModelProperty<number>({
    key: 'rho',
    defaultValue: 0.5,
});

export class Point2D extends BaseModelElement {
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly id: SketchPointId;
        readonly position: Vector2;
        readonly sketchId: SketchId;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.point',
            name: input.id,
            properties: new Map<string, ModelPropertyValue>([
                [POINT_POSITION_PROPERTY.key, copyVector2(input.position)],
            ]),
        });
        this.sketchId = input.sketchId;
    }

    public get position(): Vector2 {
        return readVector2Property(this, POINT_POSITION_PROPERTY);
    }

    public set position(position: Vector2) {
        const nextPosition = copyVector2(position);

        recordSketchPropertySet({
            after: nextPosition,
            before: this.position,
            entityRef: this.ref,
            propertyPath: ['position'],
        });
        this.setDefinedPropertyValue(POINT_POSITION_PROPERTY, nextPosition);
    }

    public get ref(): SketchEntityRef {
        return {
            id: this.id,
            kind: SketchEntityKind.Point,
            ownerId: this.sketchId,
            sketchId: this.sketchId,
        };
    }

    public snapshot(): Point2DSnapshot {
        return {
            id: this.id,
            kind: 'point',
            position: this.position,
        };
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Point2DSnapshot): Point2D {
        return new Point2D({
            id: snapshot.id,
            position: snapshot.position,
            sketchId,
        });
    }
}

export abstract class Curve2D extends BaseModelElement {
    public abstract readonly kind: Curve2DSnapshot['kind'];
    protected readonly sketchId: SketchId;

    protected constructor(input: {
        readonly id: SketchCurveId;
        readonly modelType: string;
        readonly properties?: ReadonlyMap<string, ModelPropertyValue>;
        readonly sketchId: SketchId;
    }) {
        super({
            id: input.id,
            modelType: input.modelType,
            name: input.id,
            properties: input.properties ?? null,
        });
        this.sketchId = input.sketchId;
    }

    public get ref(): SketchEntityRef {
        return {
            id: this.id,
            kind: SketchEntityKind.Curve,
            ownerId: this.sketchId,
            sketchId: this.sketchId,
        };
    }

    public abstract snapshot(): Curve2DSnapshot;

    protected getVector2Property(definition: ModelPropertyDefinition<Vector2>): Vector2 {
        return readVector2Property(this, definition);
    }
}

export class Line2D extends Curve2D {
    public readonly kind = 'line' as const;

    constructor(input: {
        readonly direction: Vector2;
        readonly id: SketchCurveId;
        readonly origin: Vector2;
        readonly sketchId: SketchId;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.curve.line',
            properties: new Map<string, ModelPropertyValue>([
                [LINE_DIRECTION_PROPERTY.key, normalizeLineDirection(input.direction)],
                [LINE_ORIGIN_PROPERTY.key, copyVector2(input.origin)],
            ]),
            sketchId: input.sketchId,
        });
    }

    public get direction(): Vector2 {
        return this.getVector2Property(LINE_DIRECTION_PROPERTY);
    }

    public set direction(direction: Vector2) {
        const nextDirection = normalizeLineDirection(direction);

        recordSketchPropertySet({
            after: nextDirection,
            before: this.direction,
            entityRef: this.ref,
            propertyPath: ['direction'],
        });
        this.setDefinedPropertyValue(LINE_DIRECTION_PROPERTY, nextDirection);
    }

    public get origin(): Vector2 {
        return this.getVector2Property(LINE_ORIGIN_PROPERTY);
    }

    public set origin(origin: Vector2) {
        const nextOrigin = copyVector2(origin);

        recordSketchPropertySet({
            after: nextOrigin,
            before: this.origin,
            entityRef: this.ref,
            propertyPath: ['origin'],
        });
        this.setDefinedPropertyValue(LINE_ORIGIN_PROPERTY, nextOrigin);
    }

    public snapshot(): Line2DSnapshot {
        return {
            direction: this.direction,
            id: this.id,
            kind: this.kind,
            origin: this.origin,
        };
    }

    public static fromPoints(input: {
        readonly end: Vector2;
        readonly id: SketchCurveId;
        readonly sketchId: SketchId;
        readonly start: Vector2;
    }): Line2D {
        return new Line2D({
            direction: Vec2.subtract(input.end, input.start),
            id: input.id,
            origin: input.start,
            sketchId: input.sketchId,
        });
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Line2DSnapshot): Line2D {
        return new Line2D({
            direction: snapshot.direction,
            id: snapshot.id,
            origin: snapshot.origin,
            sketchId,
        });
    }
}

export class Circle2D extends Curve2D {
    public readonly kind = 'circle' as const;

    constructor(input: {
        readonly center: Vector2;
        readonly id: SketchCurveId;
        readonly radius: number;
        readonly sketchId: SketchId;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.curve.circle',
            properties: new Map<string, ModelPropertyValue>([
                [CIRCLE_CENTER_PROPERTY.key, copyVector2(input.center)],
                [CIRCLE_RADIUS_PROPERTY.key, input.radius],
            ]),
            sketchId: input.sketchId,
        });
    }

    public snapshot(): Circle2DSnapshot {
        return {
            center: this.center,
            id: this.id,
            kind: this.kind,
            radius: this.radius,
        };
    }

    public get center(): Vector2 {
        return this.getVector2Property(CIRCLE_CENTER_PROPERTY);
    }

    public get radius(): number {
        return this.getNumberProperty(CIRCLE_RADIUS_PROPERTY.key);
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Circle2DSnapshot): Circle2D {
        return new Circle2D({
            center: snapshot.center,
            id: snapshot.id,
            radius: snapshot.radius,
            sketchId,
        });
    }
}

export class Ellipse2D extends Curve2D {
    public readonly kind = 'ellipse' as const;

    constructor(input: {
        readonly center: Vector2;
        readonly id: SketchCurveId;
        readonly majorRadius: number;
        readonly minorRadius: number;
        readonly sketchId: SketchId;
        readonly xAxis: Vector2;
        readonly yAxis: Vector2;
    }) {
        const coord = new Coord2({
            origin: input.center,
            xAxis: input.xAxis,
            yAxis: input.yAxis,
        });

        super({
            id: input.id,
            modelType: 'sketch.curve.ellipse',
            properties: new Map<string, ModelPropertyValue>([
                [ELLIPSE_CENTER_PROPERTY.key, coord.origin],
                [ELLIPSE_X_AXIS_PROPERTY.key, coord.xAxis],
                [ELLIPSE_Y_AXIS_PROPERTY.key, coord.yAxis],
                [ELLIPSE_MAJOR_RADIUS_PROPERTY.key, input.majorRadius],
                [ELLIPSE_MINOR_RADIUS_PROPERTY.key, input.minorRadius],
            ]),
            sketchId: input.sketchId,
        });
    }

    public get center(): Vector2 {
        return this.getVector2Property(ELLIPSE_CENTER_PROPERTY);
    }

    public get xAxis(): Vector2 {
        return this.getVector2Property(ELLIPSE_X_AXIS_PROPERTY);
    }

    public get yAxis(): Vector2 {
        return this.getVector2Property(ELLIPSE_Y_AXIS_PROPERTY);
    }

    public get majorRadius(): number {
        return this.getNumberProperty(ELLIPSE_MAJOR_RADIUS_PROPERTY.key);
    }

    public get minorRadius(): number {
        return this.getNumberProperty(ELLIPSE_MINOR_RADIUS_PROPERTY.key);
    }

    public get ellipse(): Ellipse2 {
        return new Ellipse2({
            coord: new Coord2({
                origin: this.center,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
            }),
            majorRadius: this.majorRadius,
            minorRadius: this.minorRadius,
        });
    }

    public snapshot(): Ellipse2DSnapshot {
        return {
            center: this.center,
            id: this.id,
            kind: this.kind,
            majorRadius: this.majorRadius,
            minorRadius: this.minorRadius,
            xAxis: this.xAxis,
            yAxis: this.yAxis,
        };
    }

    public static fromEllipse(input: {
        readonly ellipse: Ellipse2;
        readonly id: SketchCurveId;
        readonly sketchId: SketchId;
    }): Ellipse2D {
        return new Ellipse2D({
            center: input.ellipse.center,
            id: input.id,
            majorRadius: input.ellipse.majorRadius,
            minorRadius: input.ellipse.minorRadius,
            sketchId: input.sketchId,
            xAxis: input.ellipse.coord.xAxis,
            yAxis: input.ellipse.coord.yAxis,
        });
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Ellipse2DSnapshot): Ellipse2D {
        return new Ellipse2D({
            center: snapshot.center,
            id: snapshot.id,
            majorRadius: snapshot.majorRadius,
            minorRadius: snapshot.minorRadius,
            sketchId,
            xAxis: snapshot.xAxis,
            yAxis: snapshot.yAxis,
        });
    }
}

export class EllipticalArc2D extends Curve2D {
    public readonly kind = 'elliptical-arc' as const;

    constructor(input: {
        readonly center: Vector2;
        readonly endAngleRadians: number;
        readonly id: SketchCurveId;
        readonly majorRadius: number;
        readonly minorRadius: number;
        readonly sketchId: SketchId;
        readonly startAngleRadians: number;
        readonly xAxis: Vector2;
        readonly yAxis: Vector2;
    }) {
        const coord = new Coord2({
            origin: input.center,
            xAxis: input.xAxis,
            yAxis: input.yAxis,
        });

        super({
            id: input.id,
            modelType: 'sketch.curve.elliptical-arc',
            properties: new Map<string, ModelPropertyValue>([
                [ELLIPSE_CENTER_PROPERTY.key, coord.origin],
                [ELLIPSE_X_AXIS_PROPERTY.key, coord.xAxis],
                [ELLIPSE_Y_AXIS_PROPERTY.key, coord.yAxis],
                [ELLIPSE_MAJOR_RADIUS_PROPERTY.key, input.majorRadius],
                [ELLIPSE_MINOR_RADIUS_PROPERTY.key, input.minorRadius],
                [ARC_START_ANGLE_PROPERTY.key, input.startAngleRadians],
                [ARC_END_ANGLE_PROPERTY.key, input.endAngleRadians],
            ]),
            sketchId: input.sketchId,
        });
    }

    public get center(): Vector2 {
        return this.getVector2Property(ELLIPSE_CENTER_PROPERTY);
    }

    public get xAxis(): Vector2 {
        return this.getVector2Property(ELLIPSE_X_AXIS_PROPERTY);
    }

    public get yAxis(): Vector2 {
        return this.getVector2Property(ELLIPSE_Y_AXIS_PROPERTY);
    }

    public get majorRadius(): number {
        return this.getNumberProperty(ELLIPSE_MAJOR_RADIUS_PROPERTY.key);
    }

    public get minorRadius(): number {
        return this.getNumberProperty(ELLIPSE_MINOR_RADIUS_PROPERTY.key);
    }

    public get startAngleRadians(): number {
        return this.getNumberProperty(ARC_START_ANGLE_PROPERTY.key);
    }

    public get endAngleRadians(): number {
        return this.getNumberProperty(ARC_END_ANGLE_PROPERTY.key);
    }

    public get ellipse(): Ellipse2 {
        return new Ellipse2({
            coord: new Coord2({
                origin: this.center,
                xAxis: this.xAxis,
                yAxis: this.yAxis,
            }),
            majorRadius: this.majorRadius,
            minorRadius: this.minorRadius,
        });
    }

    public get arc(): EllipticalArc2 {
        return new EllipticalArc2(this.ellipse, this.startAngleRadians, this.endAngleRadians);
    }

    public snapshot(): EllipticalArc2DSnapshot {
        return {
            center: this.center,
            endAngleRadians: this.endAngleRadians,
            id: this.id,
            kind: this.kind,
            majorRadius: this.majorRadius,
            minorRadius: this.minorRadius,
            startAngleRadians: this.startAngleRadians,
            xAxis: this.xAxis,
            yAxis: this.yAxis,
        };
    }

    public static fromEllipticalArc(input: {
        readonly arc: EllipticalArc2;
        readonly id: SketchCurveId;
        readonly sketchId: SketchId;
    }): EllipticalArc2D {
        return new EllipticalArc2D({
            center: input.arc.ellipse.center,
            endAngleRadians: input.arc.endAngleRadians,
            id: input.id,
            majorRadius: input.arc.ellipse.majorRadius,
            minorRadius: input.arc.ellipse.minorRadius,
            sketchId: input.sketchId,
            startAngleRadians: input.arc.startAngleRadians,
            xAxis: input.arc.ellipse.coord.xAxis,
            yAxis: input.arc.ellipse.coord.yAxis,
        });
    }

    public static fromSnapshot(
        sketchId: SketchId,
        snapshot: EllipticalArc2DSnapshot,
    ): EllipticalArc2D {
        return new EllipticalArc2D({
            center: snapshot.center,
            endAngleRadians: snapshot.endAngleRadians,
            id: snapshot.id,
            majorRadius: snapshot.majorRadius,
            minorRadius: snapshot.minorRadius,
            sketchId,
            startAngleRadians: snapshot.startAngleRadians,
            xAxis: snapshot.xAxis,
            yAxis: snapshot.yAxis,
        });
    }
}

export class Arc2D extends Curve2D {
    public readonly kind = 'arc' as const;

    constructor(input: {
        readonly center: Vector2;
        readonly endAngleRadians: number;
        readonly id: SketchCurveId;
        readonly radius: number;
        readonly sketchId: SketchId;
        readonly startAngleRadians: number;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.curve.arc',
            properties: new Map<string, ModelPropertyValue>([
                [ARC_CENTER_PROPERTY.key, copyVector2(input.center)],
                [ARC_END_ANGLE_PROPERTY.key, input.endAngleRadians],
                [ARC_RADIUS_PROPERTY.key, input.radius],
                [ARC_START_ANGLE_PROPERTY.key, input.startAngleRadians],
            ]),
            sketchId: input.sketchId,
        });
    }

    public get arc(): Arc2 {
        return new Arc2(
            new Circle2(this.center, this.radius),
            Angle.fromRadians(this.startAngleRadians),
            Angle.fromRadians(this.endAngleRadians),
        );
    }

    public get center(): Vector2 {
        return this.getVector2Property(ARC_CENTER_PROPERTY);
    }

    public get endAngleRadians(): number {
        return this.getNumberProperty(ARC_END_ANGLE_PROPERTY.key);
    }

    public get radius(): number {
        return this.getNumberProperty(ARC_RADIUS_PROPERTY.key);
    }

    public get startAngleRadians(): number {
        return this.getNumberProperty(ARC_START_ANGLE_PROPERTY.key);
    }

    public snapshot(): Arc2DSnapshot {
        return {
            center: this.center,
            endAngleRadians: this.endAngleRadians,
            id: this.id,
            kind: this.kind,
            radius: this.radius,
            startAngleRadians: this.startAngleRadians,
        };
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Arc2DSnapshot): Arc2D {
        return new Arc2D({
            center: snapshot.center,
            endAngleRadians: snapshot.endAngleRadians,
            id: snapshot.id,
            radius: snapshot.radius,
            sketchId,
            startAngleRadians: snapshot.startAngleRadians,
        });
    }
}

export class Conic2D extends Curve2D {
    public readonly kind = 'conic' as const;

    constructor(input: {
        readonly endPoint: Vector2;
        readonly id: SketchCurveId;
        readonly rho: number;
        readonly shoulderPoint: Vector2;
        readonly sketchId: SketchId;
        readonly startPoint: Vector2;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.curve.conic',
            properties: new Map<string, ModelPropertyValue>([
                [CONIC_START_POINT_PROPERTY.key, copyVector2(input.startPoint)],
                [CONIC_END_POINT_PROPERTY.key, copyVector2(input.endPoint)],
                [CONIC_SHOULDER_POINT_PROPERTY.key, copyVector2(input.shoulderPoint)],
                [CONIC_RHO_PROPERTY.key, input.rho],
            ]),
            sketchId: input.sketchId,
        });
    }

    public get startPoint(): Vector2 {
        return this.getVector2Property(CONIC_START_POINT_PROPERTY);
    }

    public get endPoint(): Vector2 {
        return this.getVector2Property(CONIC_END_POINT_PROPERTY);
    }

    public get shoulderPoint(): Vector2 {
        return this.getVector2Property(CONIC_SHOULDER_POINT_PROPERTY);
    }

    public get rho(): number {
        return this.getNumberProperty(CONIC_RHO_PROPERTY.key);
    }

    public get conic(): Conic2 {
        return new Conic2({
            endPoint: this.endPoint,
            rho: this.rho,
            shoulderPoint: this.shoulderPoint,
            startPoint: this.startPoint,
        });
    }

    public snapshot(): Conic2DSnapshot {
        return {
            endPoint: this.endPoint,
            id: this.id,
            kind: this.kind,
            rho: this.rho,
            shoulderPoint: this.shoulderPoint,
            startPoint: this.startPoint,
        };
    }

    public static fromConic(input: {
        readonly conic: Conic2;
        readonly id: SketchCurveId;
        readonly sketchId: SketchId;
    }): Conic2D {
        return new Conic2D({
            endPoint: input.conic.endPoint,
            id: input.id,
            rho: input.conic.rho,
            shoulderPoint: input.conic.shoulderPoint,
            sketchId: input.sketchId,
            startPoint: input.conic.startPoint,
        });
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Conic2DSnapshot): Conic2D {
        return new Conic2D({
            endPoint: snapshot.endPoint,
            id: snapshot.id,
            rho: snapshot.rho,
            shoulderPoint: snapshot.shoulderPoint,
            sketchId,
            startPoint: snapshot.startPoint,
        });
    }
}

export class Spline2D extends Curve2D {
    public readonly closed: boolean;
    public readonly degree: number;
    public readonly endTangent: Vector2 | null;
    public readonly fitPoints: readonly Vector2[];
    public readonly kind = 'spline' as const;
    public readonly parameterization: FitSplineParameterization;
    public readonly startTangent: Vector2 | null;

    constructor(input: {
        readonly closed?: boolean;
        readonly degree?: number;
        readonly endTangent?: Vector2 | undefined;
        readonly fitPoints: readonly Vector2[];
        readonly id: SketchCurveId;
        readonly parameterization?: FitSplineParameterization;
        readonly sketchId: SketchId;
        readonly startTangent?: Vector2 | undefined;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.curve.spline',
            sketchId: input.sketchId,
        });
        this.closed = input.closed ?? false;
        this.degree = input.degree ?? 3;
        this.endTangent = input.endTangent ? copyVector2(input.endTangent) : null;
        this.fitPoints = input.fitPoints.map(copyVector2);
        this.parameterization = input.parameterization ?? 'centripetal';
        this.startTangent = input.startTangent ? copyVector2(input.startTangent) : null;
    }

    public get fitSpline(): FitSpline2 | null {
        return FitSpline2.fromFitPoints({
            closed: this.closed,
            degree: this.degree,
            ...(this.endTangent ? { endTangent: this.endTangent } : {}),
            fitPoints: this.fitPoints,
            parameterization: this.parameterization,
            ...(this.startTangent ? { startTangent: this.startTangent } : {}),
        }).value;
    }

    public snapshot(): Spline2DSnapshot {
        return {
            closed: this.closed,
            degree: this.degree,
            ...(this.endTangent ? { endTangent: this.endTangent } : {}),
            fitPoints: this.fitPoints.map(copyVector2),
            id: this.id,
            kind: this.kind,
            parameterization: this.parameterization,
            ...(this.startTangent ? { startTangent: this.startTangent } : {}),
        };
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: Spline2DSnapshot): Spline2D {
        return new Spline2D({
            closed: snapshot.closed,
            degree: snapshot.degree,
            endTangent: snapshot.endTangent,
            fitPoints: snapshot.fitPoints,
            id: snapshot.id,
            parameterization: snapshot.parameterization,
            sketchId,
            startTangent: snapshot.startTangent,
        });
    }
}

export function curveFromSnapshot(sketchId: SketchId, snapshot: Curve2DSnapshot): Curve2D {
    if (snapshot.kind === 'line') {
        return Line2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'circle') {
        return Circle2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'ellipse') {
        return Ellipse2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'elliptical-arc') {
        return EllipticalArc2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'conic') {
        return Conic2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'spline') {
        return Spline2D.fromSnapshot(sketchId, snapshot);
    }

    return Arc2D.fromSnapshot(sketchId, snapshot);
}

function copyVector2(vector: Vector2): Vector2 {
    return Vec2.of(vector.x, vector.y);
}

function readVector2Property(
    model: BaseModelElement,
    definition: ModelPropertyDefinition<Vector2>,
): Vector2 {
    const value = model.getDefinedProperty(definition);

    return isVector2(value) ? copyVector2(value) : Vec2.of(0, 0);
}

function isVector2(value: ModelPropertyValue | null): value is Vector2 {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
}

function normalizeLineDirection(direction: Vector2): Vector2 {
    const length = Vec2.length(direction);

    return length > 0 ? Vec2.scale(direction, 1 / length) : Vec2.of(1, 0);
}

function assertVector2Property(value: Vector2): void {
    if (!isVector2(value)) {
        throw new Error('Expected Vector2 model property value.');
    }
}
