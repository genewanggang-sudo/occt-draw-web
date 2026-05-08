import { Vec2, type Vector2 } from '@occt-draw/math';
import { recordSketchPropertySet } from '../changes/changeTracking';
import type {
    Arc2DSnapshot,
    Circle2DSnapshot,
    Curve2DSnapshot,
    Line2DSnapshot,
    Point2DSnapshot,
    SketchCurveId,
    SketchEntityRef,
    SketchId,
    SketchPointId,
} from '../types';

export class Point2D {
    public readonly id: SketchPointId;
    private readonly sketchId: SketchId;
    private positionValue: Vector2;

    constructor(input: {
        readonly id: SketchPointId;
        readonly position: Vector2;
        readonly sketchId: SketchId;
    }) {
        this.id = input.id;
        this.positionValue = copyVector2(input.position);
        this.sketchId = input.sketchId;
    }

    public get position(): Vector2 {
        return this.positionValue;
    }

    public set position(position: Vector2) {
        const nextPosition = copyVector2(position);

        recordSketchPropertySet({
            after: nextPosition,
            before: this.positionValue,
            entityRef: this.ref,
            propertyPath: ['position'],
        });
        this.positionValue = nextPosition;
    }

    public get ref(): SketchEntityRef {
        return {
            kind: 'point',
            pointId: this.id,
            sketchId: this.sketchId,
        };
    }

    public snapshot(): Point2DSnapshot {
        return {
            id: this.id,
            kind: 'point',
            position: copyVector2(this.positionValue),
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

export abstract class Curve2D {
    public abstract readonly id: SketchCurveId;
    public abstract readonly kind: Curve2DSnapshot['kind'];
    protected readonly sketchId: SketchId;

    protected constructor(sketchId: SketchId) {
        this.sketchId = sketchId;
    }

    public get ref(): SketchEntityRef {
        return {
            curveId: this.id,
            kind: 'curve',
            sketchId: this.sketchId,
        };
    }

    public abstract snapshot(): Curve2DSnapshot;
}

export class Line2D extends Curve2D {
    public readonly id: SketchCurveId;
    public readonly kind = 'line' as const;
    private directionValue: Vector2;
    private originValue: Vector2;

    constructor(input: {
        readonly direction: Vector2;
        readonly id: SketchCurveId;
        readonly origin: Vector2;
        readonly sketchId: SketchId;
    }) {
        super(input.sketchId);
        this.directionValue = normalizeLineDirection(input.direction);
        this.id = input.id;
        this.originValue = copyVector2(input.origin);
    }

    public get direction(): Vector2 {
        return this.directionValue;
    }

    public set direction(direction: Vector2) {
        const nextDirection = normalizeLineDirection(direction);

        recordSketchPropertySet({
            after: nextDirection,
            before: this.directionValue,
            entityRef: this.ref,
            propertyPath: ['direction'],
        });
        this.directionValue = nextDirection;
    }

    public get origin(): Vector2 {
        return this.originValue;
    }

    public set origin(origin: Vector2) {
        const nextOrigin = copyVector2(origin);

        recordSketchPropertySet({
            after: nextOrigin,
            before: this.originValue,
            entityRef: this.ref,
            propertyPath: ['origin'],
        });
        this.originValue = nextOrigin;
    }

    public snapshot(): Line2DSnapshot {
        return {
            direction: copyVector2(this.directionValue),
            id: this.id,
            kind: this.kind,
            origin: copyVector2(this.originValue),
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
    public readonly id: SketchCurveId;
    public readonly kind = 'circle' as const;
    private centerValue: Vector2;
    private radiusValue: number;

    constructor(input: {
        readonly center: Vector2;
        readonly id: SketchCurveId;
        readonly radius: number;
        readonly sketchId: SketchId;
    }) {
        super(input.sketchId);
        this.centerValue = copyVector2(input.center);
        this.id = input.id;
        this.radiusValue = input.radius;
    }

    public snapshot(): Circle2DSnapshot {
        return {
            center: copyVector2(this.centerValue),
            id: this.id,
            kind: this.kind,
            radius: this.radiusValue,
        };
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

export class Arc2D extends Curve2D {
    public readonly id: SketchCurveId;
    public readonly kind = 'arc' as const;
    private centerValue: Vector2;
    private endAngleRadiansValue: number;
    private radiusValue: number;
    private startAngleRadiansValue: number;

    constructor(input: {
        readonly center: Vector2;
        readonly endAngleRadians: number;
        readonly id: SketchCurveId;
        readonly radius: number;
        readonly sketchId: SketchId;
        readonly startAngleRadians: number;
    }) {
        super(input.sketchId);
        this.centerValue = copyVector2(input.center);
        this.endAngleRadiansValue = input.endAngleRadians;
        this.id = input.id;
        this.radiusValue = input.radius;
        this.startAngleRadiansValue = input.startAngleRadians;
    }

    public snapshot(): Arc2DSnapshot {
        return {
            center: copyVector2(this.centerValue),
            endAngleRadians: this.endAngleRadiansValue,
            id: this.id,
            kind: this.kind,
            radius: this.radiusValue,
            startAngleRadians: this.startAngleRadiansValue,
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

export function curveFromSnapshot(sketchId: SketchId, snapshot: Curve2DSnapshot): Curve2D {
    if (snapshot.kind === 'line') {
        return Line2D.fromSnapshot(sketchId, snapshot);
    }

    if (snapshot.kind === 'circle') {
        return Circle2D.fromSnapshot(sketchId, snapshot);
    }

    return Arc2D.fromSnapshot(sketchId, snapshot);
}

function copyVector2(vector: Vector2): Vector2 {
    return Vec2.of(vector.x, vector.y);
}

function normalizeLineDirection(direction: Vector2): Vector2 {
    const length = Vec2.length(direction);

    return length > 0 ? Vec2.scale(direction, 1 / length) : Vec2.of(1, 0);
}
