import {
    SketchEntityKind,
    type EdgeSnapshot,
    type SketchCurveId,
    type SketchEdgeId,
    type SketchEdgeRole,
    type SketchEntityRef,
    type SketchId,
    type SketchPointId,
    type SketchVertexId,
    type VertexSnapshot,
} from '../types';

export class Vertex {
    public readonly id: SketchVertexId;
    public readonly pointId: SketchPointId;
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly id: SketchVertexId;
        readonly pointId: SketchPointId;
        readonly sketchId: SketchId;
    }) {
        this.id = input.id;
        this.pointId = input.pointId;
        this.sketchId = input.sketchId;
    }

    public get ref(): SketchEntityRef {
        return {
            entityId: this.id,
            kind: SketchEntityKind.Vertex,
            sketchId: this.sketchId,
        };
    }

    public snapshot(): VertexSnapshot {
        return {
            id: this.id,
            kind: 'vertex',
            pointId: this.pointId,
        };
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: VertexSnapshot): Vertex {
        return new Vertex({
            id: snapshot.id,
            pointId: snapshot.pointId,
            sketchId,
        });
    }
}

export class Edge {
    public readonly curveId: SketchCurveId;
    public readonly endVertexId: SketchVertexId;
    public readonly id: SketchEdgeId;
    public readonly role: SketchEdgeRole;
    private readonly sketchId: SketchId;
    public readonly startVertexId: SketchVertexId;

    constructor(input: {
        readonly curveId: SketchCurveId;
        readonly endVertexId: SketchVertexId;
        readonly id: SketchEdgeId;
        readonly role?: SketchEdgeRole;
        readonly sketchId: SketchId;
        readonly startVertexId: SketchVertexId;
    }) {
        this.curveId = input.curveId;
        this.endVertexId = input.endVertexId;
        this.id = input.id;
        this.role = input.role ?? 'normal';
        this.sketchId = input.sketchId;
        this.startVertexId = input.startVertexId;
    }

    public get ref(): SketchEntityRef {
        return {
            entityId: this.id,
            kind: SketchEntityKind.Edge,
            sketchId: this.sketchId,
        };
    }

    public snapshot(): EdgeSnapshot {
        return {
            curveId: this.curveId,
            endVertexId: this.endVertexId,
            id: this.id,
            kind: 'edge',
            role: this.role,
            startVertexId: this.startVertexId,
        };
    }

    public static fromSnapshot(sketchId: SketchId, snapshot: EdgeSnapshot): Edge {
        return new Edge({
            curveId: snapshot.curveId,
            endVertexId: snapshot.endVertexId,
            id: snapshot.id,
            role: snapshot.role,
            sketchId,
            startVertexId: snapshot.startVertexId,
        });
    }
}
