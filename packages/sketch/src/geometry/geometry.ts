import {
    BaseModelElement,
    defineModelProperty,
    type ModelPropertyDefinition,
    type ModelPropertyValue,
} from '@occt-draw/core';
import { Vec2, type Vector2 } from '@occt-draw/math';
import { recordSketchPropertySet } from '../changes/changeTracking';
import {
    SketchEntityKind,
    type Arc2DSnapshot,
    type Circle2DSnapshot,
    type Curve2DSnapshot,
    type Line2DSnapshot,
    type Point2DSnapshot,
    type SketchCurveId,
    type SketchEntityRef,
    type SketchId,
    type SketchPointId,
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
            center: this.getVector2Property(CIRCLE_CENTER_PROPERTY),
            id: this.id,
            kind: this.kind,
            radius: this.getNumberProperty(CIRCLE_RADIUS_PROPERTY.key),
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

    public snapshot(): Arc2DSnapshot {
        return {
            center: this.getVector2Property(ARC_CENTER_PROPERTY),
            endAngleRadians: this.getNumberProperty(ARC_END_ANGLE_PROPERTY.key),
            id: this.id,
            kind: this.kind,
            radius: this.getNumberProperty(ARC_RADIUS_PROPERTY.key),
            startAngleRadians: this.getNumberProperty(ARC_START_ANGLE_PROPERTY.key),
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
