import type { Vector2 } from '@occt-draw/math';
import {
    SketchPrimitiveBuilder,
    type SketchLineSegmentInput,
} from '../model/SketchPrimitiveBuilder';
import type { Sketch } from '../model/sketch';
import type { SketchEdgeId, SketchEntityRef, SketchVertexId } from '../types';

export abstract class SketchEdit {
    public abstract readonly kind: string;
    public abstract readonly label: string;

    public abstract apply(sketch: Sketch): void;
}

export class AddPointEdit extends SketchEdit {
    public readonly kind = 'add-point';
    public readonly label = 'Add sketch point';
    public createdPointId: string | null = null;
    public createdVertexId: SketchVertexId | null = null;
    private readonly position: Vector2;

    constructor(input: { readonly position: Vector2 }) {
        super();
        this.position = input.position;
    }

    public apply(sketch: Sketch): void {
        const result = new SketchPrimitiveBuilder(sketch).addPoint(this.position);

        this.createdPointId = result.createdPointId ?? null;
        this.createdVertexId = result.createdVertexId ?? null;
    }
}

export class AddLineSegmentEdit extends SketchEdit {
    public readonly kind = 'add-line-segment';
    public readonly label = 'Add sketch line';
    public createdEdgeId: SketchEdgeId | null = null;
    public createdEndVertexId: SketchVertexId | null = null;
    private readonly input: SketchLineSegmentInput;

    constructor(input: SketchLineSegmentInput) {
        super();
        this.input = input;
    }

    public apply(sketch: Sketch): void {
        const result = new SketchPrimitiveBuilder(sketch).addLineSegment(this.input);

        this.createdEdgeId = result?.createdEdgeId ?? null;
        this.createdEndVertexId = result?.createdVertexId ?? null;
    }
}

export class AddClosedLineSegmentsEdit extends SketchEdit {
    public readonly kind = 'add-closed-line-segments';
    public readonly label = 'Add sketch line segments';
    public readonly createdEdgeIds: SketchEdgeId[] = [];
    private readonly points: readonly Vector2[];

    constructor(input: { readonly points: readonly Vector2[] }) {
        super();
        this.points = input.points;
    }

    public apply(sketch: Sketch): void {
        const result = new SketchPrimitiveBuilder(sketch).addClosedPolyline(this.points);

        this.createdEdgeIds.splice(
            0,
            this.createdEdgeIds.length,
            ...(result?.createdEdgeIds ?? []),
        );
    }
}

export class AddCornerRectangleEdit extends SketchEdit {
    public readonly kind = 'add-corner-rectangle';
    public readonly label = 'Add sketch rectangle';
    public readonly createdEdgeIds: SketchEdgeId[] = [];
    private readonly firstCorner: Vector2;
    private readonly oppositeCorner: Vector2;

    constructor(input: { readonly firstCorner: Vector2; readonly oppositeCorner: Vector2 }) {
        super();
        this.firstCorner = input.firstCorner;
        this.oppositeCorner = input.oppositeCorner;
    }

    public apply(sketch: Sketch): void {
        const result = new SketchPrimitiveBuilder(sketch).addRectangleFromCorners(
            this.firstCorner,
            this.oppositeCorner,
        );

        this.createdEdgeIds.splice(
            0,
            this.createdEdgeIds.length,
            ...(result?.createdEdgeIds ?? []),
        );
    }
}

export class AddCircleEdit extends SketchEdit {
    public readonly kind = 'add-circle';
    public readonly label = 'Add sketch circle';
    public createdCurveId: string | null = null;
    private readonly center: Vector2;
    private readonly radius: number;

    constructor(input: { readonly center: Vector2; readonly radius: number }) {
        super();
        this.center = input.center;
        this.radius = input.radius;
    }

    public apply(sketch: Sketch): void {
        const result = new SketchPrimitiveBuilder(sketch).addCircle(this.center, this.radius);

        this.createdCurveId = result?.createdCurveId ?? null;
    }
}

export class DeleteSketchEntityEdit extends SketchEdit {
    public readonly kind = 'delete-entity';
    public readonly label = 'Delete sketch entity';
    private readonly entityRef: SketchEntityRef;

    constructor(input: { readonly entityRef: SketchEntityRef }) {
        super();
        this.entityRef = input.entityRef;
    }

    public apply(sketch: Sketch): void {
        new SketchPrimitiveBuilder(sketch).deleteEntity(this.entityRef);
    }
}

export class MoveVertexEdit extends SketchEdit {
    public readonly kind = 'move-vertex';
    public readonly label = 'Move sketch vertex';
    private readonly target: Vector2;
    private readonly vertexId: SketchVertexId;

    constructor(input: { readonly target: Vector2; readonly vertexId: SketchVertexId }) {
        super();
        this.target = input.target;
        this.vertexId = input.vertexId;
    }

    public apply(sketch: Sketch): void {
        new SketchPrimitiveBuilder(sketch).moveVertex(this.vertexId, this.target);
    }
}
