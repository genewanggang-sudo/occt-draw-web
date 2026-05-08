import type { Vector2 } from '@occt-draw/math';
import { Line2D, Point2D } from '../geometry/geometry';
import type { Sketch } from '../model/sketch';
import { Edge, Vertex } from '../topology/topology';
import { SketchTransaction } from '../transaction/transaction';
import type { SketchEdgeId, SketchEntityRef, SketchVertexId } from '../types';

export abstract class SketchRequest {
    public abstract readonly label: string;

    public createTransaction(): SketchTransaction {
        return new SketchTransaction({
            label: this.label,
            request: this,
        });
    }

    public abstract apply(sketch: Sketch): void;
}

export class AddPointRequest extends SketchRequest {
    public readonly label = '添加草图点';
    public createdPointId: string | null = null;
    public createdVertexId: SketchVertexId | null = null;
    private readonly position: Vector2;

    constructor(input: { readonly position: Vector2 }) {
        super();
        this.position = input.position;
    }

    public apply(sketch: Sketch): void {
        const pointId = sketch.state.allocatePointId();
        const vertexId = sketch.state.allocateVertexId();
        const point = new Point2D({
            id: pointId,
            position: this.position,
            sketchId: sketch.id,
        });
        const vertex = new Vertex({
            id: vertexId,
            pointId,
            sketchId: sketch.id,
        });

        sketch.entities.geometry.points.add(point);
        sketch.entities.topology.vertices.add(vertex);
        this.createdPointId = pointId;
        this.createdVertexId = vertexId;
    }
}

export class AddLineSegmentRequest extends SketchRequest {
    public readonly label = '添加草图直线';
    public createdEdgeId: SketchEdgeId | null = null;
    public createdEndVertexId: SketchVertexId | null = null;
    private readonly endPosition: Vector2;
    private readonly startVertexId: SketchVertexId;

    constructor(input: { readonly endPosition: Vector2; readonly startVertexId: SketchVertexId }) {
        super();
        this.endPosition = input.endPosition;
        this.startVertexId = input.startVertexId;
    }

    public apply(sketch: Sketch): void {
        const startPoint = sketch.findPointForVertex(this.startVertexId);

        if (!startPoint) {
            return;
        }

        const endPointId = sketch.state.allocatePointId();
        const endVertexId = sketch.state.allocateVertexId();
        const curveId = sketch.state.allocateCurveId();
        const edgeId = sketch.state.allocateEdgeId();
        const endPoint = new Point2D({
            id: endPointId,
            position: this.endPosition,
            sketchId: sketch.id,
        });
        const endVertex = new Vertex({
            id: endVertexId,
            pointId: endPointId,
            sketchId: sketch.id,
        });
        const curve = Line2D.fromPoints({
            end: this.endPosition,
            id: curveId,
            sketchId: sketch.id,
            start: startPoint.position,
        });
        const edge = new Edge({
            curveId,
            endVertexId,
            id: edgeId,
            sketchId: sketch.id,
            startVertexId: this.startVertexId,
        });

        sketch.entities.geometry.points.add(endPoint);
        sketch.entities.topology.vertices.add(endVertex);
        sketch.entities.geometry.curves.add(curve);
        sketch.entities.topology.edges.add(edge);
        this.createdEdgeId = edgeId;
        this.createdEndVertexId = endVertexId;
    }
}

export class DeleteSketchEntityRequest extends SketchRequest {
    public readonly label = '删除草图对象';
    private readonly entityRef: SketchEntityRef;

    constructor(input: { readonly entityRef: SketchEntityRef }) {
        super();
        this.entityRef = input.entityRef;
    }

    public apply(sketch: Sketch): void {
        if (this.entityRef.kind === 'edge') {
            deleteEdge(sketch, this.entityRef.edgeId);
            return;
        }

        if (this.entityRef.kind === 'vertex') {
            deleteVertex(sketch, this.entityRef.vertexId);
        }
    }
}

export class MoveVertexRequest extends SketchRequest {
    public readonly label = '移动草图顶点';
    private readonly target: Vector2;
    private readonly vertexId: SketchVertexId;

    constructor(input: { readonly target: Vector2; readonly vertexId: SketchVertexId }) {
        super();
        this.target = input.target;
        this.vertexId = input.vertexId;
    }

    public apply(sketch: Sketch): void {
        const point = sketch.findPointForVertex(this.vertexId);

        if (point) {
            point.position = this.target;
        }
    }
}

function deleteEdge(sketch: Sketch, edgeId: SketchEdgeId): void {
    const edge = sketch.entities.topology.edges.get(edgeId);

    if (!edge) {
        return;
    }

    sketch.entities.topology.edges.remove(edge.id);
    sketch.entities.geometry.curves.remove(edge.curveId);
    deleteVertexIfOrphan(sketch, edge.startVertexId);
    deleteVertexIfOrphan(sketch, edge.endVertexId);
}

function deleteVertex(sketch: Sketch, vertexId: SketchVertexId): void {
    for (const edge of sketch.entities.topology.edges.list()) {
        if (edge.startVertexId === vertexId || edge.endVertexId === vertexId) {
            deleteEdge(sketch, edge.id);
        }
    }

    deleteVertexIfOrphan(sketch, vertexId);
}

function deleteVertexIfOrphan(sketch: Sketch, vertexId: SketchVertexId): void {
    const isUsed = sketch.entities.topology.edges
        .list()
        .some((edge) => edge.startVertexId === vertexId || edge.endVertexId === vertexId);

    if (isUsed) {
        return;
    }

    const vertex = sketch.entities.topology.vertices.remove(vertexId);

    if (vertex) {
        sketch.entities.geometry.points.remove(vertex.pointId);
    }
}
