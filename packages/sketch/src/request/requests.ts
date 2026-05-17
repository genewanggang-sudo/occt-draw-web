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
    private readonly endPosition: Vector2 | null;
    private readonly endVertexId: SketchVertexId | null;
    private readonly startVertexId: SketchVertexId;

    constructor(
        input:
            | { readonly endPosition: Vector2; readonly startVertexId: SketchVertexId }
            | { readonly endVertexId: SketchVertexId; readonly startVertexId: SketchVertexId },
    ) {
        super();
        this.endPosition = 'endPosition' in input ? input.endPosition : null;
        this.endVertexId = 'endVertexId' in input ? input.endVertexId : null;
        this.startVertexId = input.startVertexId;
    }

    public apply(sketch: Sketch): void {
        const startPoint = sketch.findPointForVertex(this.startVertexId);

        if (!startPoint) {
            return;
        }

        const existingEndVertex = this.endVertexId
            ? sketch.entities.topology.vertices.get(this.endVertexId)
            : null;
        const existingEndPoint = this.endVertexId
            ? sketch.findPointForVertex(this.endVertexId)
            : null;
        const endPosition = existingEndPoint?.position ?? this.endPosition;

        if (!endPosition) {
            return;
        }

        const endVertexId = existingEndVertex?.id ?? sketch.state.allocateVertexId();
        const endPointId = existingEndVertex?.pointId ?? sketch.state.allocatePointId();
        const curveId = sketch.state.allocateCurveId();
        const edgeId = sketch.state.allocateEdgeId();
        const endPoint = new Point2D({
            id: endPointId,
            position: endPosition,
            sketchId: sketch.id,
        });
        const endVertex = new Vertex({
            id: endVertexId,
            pointId: endPointId,
            sketchId: sketch.id,
        });
        const curve = Line2D.fromPoints({
            end: endPosition,
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

        if (!existingEndVertex) {
            sketch.entities.geometry.points.add(endPoint);
            sketch.entities.topology.vertices.add(endVertex);
        }
        sketch.entities.geometry.curves.add(curve);
        sketch.entities.topology.edges.add(edge);
        this.createdEdgeId = edgeId;
        this.createdEndVertexId = endVertexId;
    }
}

export class AddCornerRectangleRequest extends SketchRequest {
    public readonly label = '添加草图矩形';
    public readonly createdEdgeIds: SketchEdgeId[] = [];
    private readonly firstCorner: Vector2;
    private readonly oppositeCorner: Vector2;

    constructor(input: { readonly firstCorner: Vector2; readonly oppositeCorner: Vector2 }) {
        super();
        this.firstCorner = input.firstCorner;
        this.oppositeCorner = input.oppositeCorner;
    }

    public apply(sketch: Sketch): void {
        const corners = getCornerRectanglePoints(this.firstCorner, this.oppositeCorner);
        const vertices = corners.map((position) => {
            const pointId = sketch.state.allocatePointId();
            const vertexId = sketch.state.allocateVertexId();
            const point = new Point2D({
                id: pointId,
                position,
                sketchId: sketch.id,
            });
            const vertex = new Vertex({
                id: vertexId,
                pointId,
                sketchId: sketch.id,
            });

            sketch.entities.geometry.points.add(point);
            sketch.entities.topology.vertices.add(vertex);

            return { point, vertex };
        });

        for (let index = 0; index < vertices.length; index += 1) {
            const start = vertices[index];
            const end = vertices[(index + 1) % vertices.length];

            if (!start || !end) {
                continue;
            }

            const curveId = sketch.state.allocateCurveId();
            const edgeId = sketch.state.allocateEdgeId();
            const curve = Line2D.fromPoints({
                end: end.point.position,
                id: curveId,
                sketchId: sketch.id,
                start: start.point.position,
            });
            const edge = new Edge({
                curveId,
                endVertexId: end.vertex.id,
                id: edgeId,
                sketchId: sketch.id,
                startVertexId: start.vertex.id,
            });

            sketch.entities.geometry.curves.add(curve);
            sketch.entities.topology.edges.add(edge);
            this.createdEdgeIds.push(edgeId);
        }
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

function getCornerRectanglePoints(
    firstCorner: Vector2,
    oppositeCorner: Vector2,
): readonly Vector2[] {
    return [
        firstCorner,
        { x: oppositeCorner.x, y: firstCorner.y },
        oppositeCorner,
        { x: firstCorner.x, y: oppositeCorner.y },
    ];
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
