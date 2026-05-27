import type { Vector2 } from '@occt-draw/math';
import type { SketchChangeRecorder } from '../changes/changeTracking';
import { withActiveSketchChangeRecorder } from '../changes/changeTracking';
import { Circle2D, Line2D, Point2D } from '../geometry/geometry';
import type { Sketch } from './sketch';
import { Edge, Vertex } from '../topology/topology';
import {
    SketchEntityKind,
    type SketchCurveId,
    type SketchEdgeId,
    type SketchEntityRef,
    type SketchPointId,
    type SketchVertexId,
} from '../types';

const MIN_SKETCH_EDGE_LENGTH = 1e-6;

export type SketchLineSegmentInput =
    | { readonly endPosition: Vector2; readonly startPosition: Vector2 }
    | { readonly endPosition: Vector2; readonly startVertexId: SketchVertexId }
    | { readonly endVertexId: SketchVertexId; readonly startPosition: Vector2 }
    | { readonly endVertexId: SketchVertexId; readonly startVertexId: SketchVertexId };

export interface SketchPrimitiveResult {
    readonly createdCurveId?: SketchCurveId | undefined;
    readonly createdEdgeId?: SketchEdgeId | undefined;
    readonly createdEdgeIds?: readonly SketchEdgeId[] | undefined;
    readonly createdPointId?: SketchPointId | undefined;
    readonly createdVertexId?: SketchVertexId | undefined;
    readonly touchedEntityRefs: readonly SketchEntityRef[];
}

export interface SketchPrimitiveBuilderOptions {
    readonly recorder?: SketchChangeRecorder | undefined;
}

export class SketchPrimitiveBuilder {
    private readonly recorder: SketchChangeRecorder | null;
    private readonly sketch: Sketch;

    constructor(sketch: Sketch, options: SketchPrimitiveBuilderOptions = {}) {
        this.recorder = options.recorder ?? null;
        this.sketch = sketch;
    }

    public addPoint(position: Vector2): SketchPrimitiveResult {
        return this.capture(() => this.addPointCore(position));
    }

    public addLineSegment(input: SketchLineSegmentInput): SketchPrimitiveResult | null {
        return this.capture(() => this.addLineSegmentCore(input));
    }

    public addClosedPolyline(points: readonly Vector2[]): SketchPrimitiveResult | null {
        return this.capture(() => {
            if (!isValidClosedPolyline(points)) {
                return null;
            }

            return this.addLineLoop(points);
        });
    }

    public addRectangleFromCorners(
        firstCorner: Vector2,
        oppositeCorner: Vector2,
    ): SketchPrimitiveResult | null {
        return this.capture(() => {
            if (!isValidRectangle(firstCorner, oppositeCorner)) {
                return null;
            }

            return this.addLineLoop([
                firstCorner,
                { x: oppositeCorner.x, y: firstCorner.y },
                oppositeCorner,
                { x: firstCorner.x, y: oppositeCorner.y },
            ]);
        });
    }

    public addCircle(center: Vector2, radius: number): SketchPrimitiveResult | null {
        return this.capture(() => this.addCircleCore(center, radius));
    }

    public deleteEntity(entityRef: SketchEntityRef): SketchPrimitiveResult | null {
        return this.capture(() => {
            if (entityRef.kind === SketchEntityKind.Edge) {
                return this.deleteEdge(entityRef.id);
            }

            if (entityRef.kind === SketchEntityKind.Vertex) {
                return this.deleteVertex(entityRef.id);
            }

            return null;
        });
    }

    public moveVertex(vertexId: SketchVertexId, target: Vector2): SketchPrimitiveResult | null {
        return this.capture(() => this.moveVertexCore(vertexId, target));
    }

    private addPointCore(position: Vector2): SketchPrimitiveResult {
        const pointId = this.sketch.state.allocatePointId();
        const vertexId = this.sketch.state.allocateVertexId();
        const point = new Point2D({
            id: pointId,
            position,
            sketchId: this.sketch.id,
        });
        const vertex = new Vertex({
            id: vertexId,
            pointId,
            sketchId: this.sketch.id,
        });

        this.sketch.entities.geometry.points.add(point);
        this.sketch.entities.topology.vertices.add(vertex);

        return {
            createdPointId: pointId,
            createdVertexId: vertexId,
            touchedEntityRefs: [point.ref, vertex.ref],
        };
    }

    private addLineSegmentCore(input: SketchLineSegmentInput): SketchPrimitiveResult | null {
        const start = this.resolveEndpoint({
            position: 'startPosition' in input ? input.startPosition : null,
            vertexId: 'startVertexId' in input ? input.startVertexId : null,
        });
        const end = this.resolveEndpoint({
            position: 'endPosition' in input ? input.endPosition : null,
            vertexId: 'endVertexId' in input ? input.endVertexId : null,
        });

        if (!start || !end || !isValidEdgeLength(start.position, end.position)) {
            return null;
        }

        const startVertex = start.existingVertex
            ? { ...start.existingVertex, touchedEntityRefs: [] }
            : this.addVertexAtPosition(start.position);
        const endVertex = end.existingVertex
            ? { ...end.existingVertex, touchedEntityRefs: [] }
            : this.addVertexAtPosition(end.position);
        const curveId = this.sketch.state.allocateCurveId();
        const edgeId = this.sketch.state.allocateEdgeId();
        const curve = Line2D.fromPoints({
            end: end.position,
            id: curveId,
            sketchId: this.sketch.id,
            start: start.position,
        });
        const edge = new Edge({
            curveId,
            endVertexId: endVertex.vertex.id,
            id: edgeId,
            sketchId: this.sketch.id,
            startVertexId: startVertex.vertex.id,
        });

        this.sketch.entities.geometry.curves.add(curve);
        this.sketch.entities.topology.edges.add(edge);

        return {
            createdCurveId: curveId,
            createdEdgeId: edgeId,
            createdVertexId: end.existingVertex ? undefined : endVertex.vertex.id,
            touchedEntityRefs: [
                ...startVertex.touchedEntityRefs,
                ...endVertex.touchedEntityRefs,
                curve.ref,
                edge.ref,
            ],
        };
    }

    private addCircleCore(center: Vector2, radius: number): SketchPrimitiveResult | null {
        if (radius <= 0) {
            return null;
        }

        const curveId = this.sketch.state.allocateCurveId();
        const circle = new Circle2D({
            center,
            id: curveId,
            radius,
            sketchId: this.sketch.id,
        });

        this.sketch.entities.geometry.curves.add(circle);

        return {
            createdCurveId: curveId,
            touchedEntityRefs: [circle.ref],
        };
    }

    private moveVertexCore(
        vertexId: SketchVertexId,
        target: Vector2,
    ): SketchPrimitiveResult | null {
        const point = this.sketch.findPointForVertex(vertexId);

        if (!point || (point.position.x === target.x && point.position.y === target.y)) {
            return null;
        }

        point.position = target;

        return {
            touchedEntityRefs: [point.ref],
        };
    }

    private capture<TResult>(action: () => TResult): TResult {
        return this.recorder ? withActiveSketchChangeRecorder(this.recorder, action) : action();
    }

    private addLineLoop(points: readonly Vector2[]): SketchPrimitiveResult {
        const vertices = points.map((position) => this.addVertexAtPosition(position));
        const createdEdgeIds: SketchEdgeId[] = [];
        const touchedEntityRefs: SketchEntityRef[] = vertices.flatMap(
            (vertex) => vertex.touchedEntityRefs,
        );

        for (let index = 0; index < vertices.length; index += 1) {
            const start = vertices[index];
            const end = vertices[(index + 1) % vertices.length];

            if (!start || !end) {
                continue;
            }

            const curveId = this.sketch.state.allocateCurveId();
            const edgeId = this.sketch.state.allocateEdgeId();
            const curve = Line2D.fromPoints({
                end: end.point.position,
                id: curveId,
                sketchId: this.sketch.id,
                start: start.point.position,
            });
            const edge = new Edge({
                curveId,
                endVertexId: end.vertex.id,
                id: edgeId,
                sketchId: this.sketch.id,
                startVertexId: start.vertex.id,
            });

            this.sketch.entities.geometry.curves.add(curve);
            this.sketch.entities.topology.edges.add(edge);
            createdEdgeIds.push(edgeId);
            touchedEntityRefs.push(curve.ref, edge.ref);
        }

        return {
            createdEdgeIds,
            touchedEntityRefs,
        };
    }

    private addVertexAtPosition(position: Vector2): {
        readonly point: Point2D;
        readonly touchedEntityRefs: readonly SketchEntityRef[];
        readonly vertex: Vertex;
    } {
        const pointId = this.sketch.state.allocatePointId();
        const vertexId = this.sketch.state.allocateVertexId();
        const point = new Point2D({
            id: pointId,
            position,
            sketchId: this.sketch.id,
        });
        const vertex = new Vertex({
            id: vertexId,
            pointId,
            sketchId: this.sketch.id,
        });

        this.sketch.entities.geometry.points.add(point);
        this.sketch.entities.topology.vertices.add(vertex);

        return {
            point,
            touchedEntityRefs: [point.ref, vertex.ref],
            vertex,
        };
    }

    private resolveEndpoint(input: {
        readonly position: Vector2 | null;
        readonly vertexId: SketchVertexId | null;
    }): {
        readonly existingVertex: { readonly point: Point2D; readonly vertex: Vertex } | null;
        readonly position: Vector2;
    } | null {
        if (!input.vertexId) {
            return input.position
                ? {
                      existingVertex: null,
                      position: input.position,
                  }
                : null;
        }

        const vertex = this.sketch.entities.topology.vertices.get(input.vertexId);
        const point = this.sketch.findPointForVertex(input.vertexId);
        const position = point?.position ?? input.position;

        if (!position) {
            return null;
        }

        return {
            existingVertex: vertex && point ? { point, vertex } : null,
            position,
        };
    }

    private deleteEdge(edgeId: SketchEdgeId): SketchPrimitiveResult | null {
        const edge = this.sketch.entities.topology.edges.get(edgeId);

        if (!edge) {
            return null;
        }

        const touchedEntityRefs: SketchEntityRef[] = [edge.ref];
        const curve = this.sketch.entities.geometry.curves.remove(edge.curveId);

        if (curve) {
            touchedEntityRefs.push(curve.ref);
        }

        this.sketch.entities.topology.edges.remove(edge.id);
        this.deleteVertexIfOrphan(edge.startVertexId, touchedEntityRefs);
        this.deleteVertexIfOrphan(edge.endVertexId, touchedEntityRefs);

        return {
            touchedEntityRefs,
        };
    }

    private deleteVertex(vertexId: SketchVertexId): SketchPrimitiveResult | null {
        const touchedEntityRefs: SketchEntityRef[] = [];

        for (const edge of this.sketch.entities.topology.edges.list()) {
            if (edge.startVertexId === vertexId || edge.endVertexId === vertexId) {
                const result = this.deleteEdge(edge.id);

                if (result) {
                    touchedEntityRefs.push(...result.touchedEntityRefs);
                }
            }
        }

        this.deleteVertexIfOrphan(vertexId, touchedEntityRefs);

        return touchedEntityRefs.length > 0
            ? {
                  touchedEntityRefs,
              }
            : null;
    }

    private deleteVertexIfOrphan(
        vertexId: SketchVertexId,
        touchedEntityRefs: SketchEntityRef[],
    ): void {
        const isUsed = this.sketch.entities.topology.edges
            .list()
            .some((edge) => edge.startVertexId === vertexId || edge.endVertexId === vertexId);

        if (isUsed) {
            return;
        }

        const vertex = this.sketch.entities.topology.vertices.remove(vertexId);

        if (!vertex) {
            return;
        }

        touchedEntityRefs.push(vertex.ref);

        const point = this.sketch.entities.geometry.points.remove(vertex.pointId);

        if (point) {
            touchedEntityRefs.push(point.ref);
        }
    }
}

function isValidClosedPolyline(points: readonly Vector2[]): boolean {
    if (points.length < 3) {
        return false;
    }

    return points.every((point, index) => {
        const next = points[(index + 1) % points.length];

        return Boolean(next && isValidEdgeLength(point, next));
    });
}

function isValidRectangle(firstCorner: Vector2, oppositeCorner: Vector2): boolean {
    return (
        Math.abs(oppositeCorner.x - firstCorner.x) > MIN_SKETCH_EDGE_LENGTH &&
        Math.abs(oppositeCorner.y - firstCorner.y) > MIN_SKETCH_EDGE_LENGTH
    );
}

function isValidEdgeLength(start: Vector2, end: Vector2): boolean {
    return Math.hypot(end.x - start.x, end.y - start.y) > MIN_SKETCH_EDGE_LENGTH;
}
