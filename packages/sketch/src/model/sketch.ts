import type { ReferencePlaneKind } from '@occt-draw/core';
import { Vec2, type Plane3, type Vector2, type Vector3 } from '@occt-draw/math';
import {
    recordSketchEntityAdded,
    recordSketchEntityRemoved,
    recordSketchPropertySet,
} from '../changes/changeTracking';
import { curveFromSnapshot, Point2D, type Curve2D } from '../geometry/geometry';
import { Edge, Vertex } from '../topology/topology';
import type {
    SketchCurveId,
    SketchEdgeId,
    SketchEntityRef,
    SketchEntitySnapshot,
    SketchId,
    SketchPlaneInput,
    SketchPointId,
    SketchPropertyValue,
    SketchStateSnapshot,
    SketchVertexId,
} from '../types';

export class SketchPlane {
    public readonly planeKind: ReferencePlaneKind;
    public readonly planeRef: string;

    constructor(input: SketchPlaneInput) {
        this.planeKind = input.planeKind;
        this.planeRef = input.planeRef;
    }
}

export class Sketch {
    public readonly constraints: SketchConstraints;
    public readonly dimensions: SketchDimensions;
    public readonly entities: SketchEntities;
    public readonly id: SketchId;
    public readonly name: string;
    public readonly plane: SketchPlane;
    public readonly profiles: SketchProfiles;
    public readonly state: SketchState;

    constructor(input: {
        readonly constraints?: SketchConstraints;
        readonly dimensions?: SketchDimensions;
        readonly entities?: SketchEntities;
        readonly id: SketchId;
        readonly name: string;
        readonly plane: SketchPlane;
        readonly profiles?: SketchProfiles;
        readonly state?: SketchState;
    }) {
        this.constraints = input.constraints ?? new SketchConstraints(input.id);
        this.dimensions = input.dimensions ?? new SketchDimensions(input.id);
        this.entities = input.entities ?? SketchEntities.empty(input.id);
        this.id = input.id;
        this.name = input.name;
        this.plane = input.plane;
        this.profiles = input.profiles ?? new SketchProfiles(input.id);
        this.state = input.state ?? SketchState.createInitial(input.id);
    }

    public get planeKind(): ReferencePlaneKind {
        return this.plane.planeKind;
    }

    public get planeRef(): string {
        return this.plane.planeRef;
    }

    public get revision(): number {
        return this.state.revision;
    }

    public clone(): Sketch {
        return new Sketch({
            constraints: this.constraints.clone(),
            dimensions: this.dimensions.clone(),
            entities: this.entities.clone(),
            id: this.id,
            name: this.name,
            plane: new SketchPlane(this.plane),
            profiles: this.profiles.clone(),
            state: this.state.clone(),
        });
    }

    public findPointForVertex(vertexId: SketchVertexId): Point2D | null {
        const vertex = this.entities.topology.vertices.get(vertexId);

        return vertex ? this.entities.geometry.points.get(vertex.pointId) : null;
    }

    public removeEntity(entityRef: SketchEntityRef): void {
        if (entityRef.kind === 'point') {
            this.entities.geometry.points.remove(entityRef.pointId);
            return;
        }

        if (entityRef.kind === 'curve') {
            this.entities.geometry.curves.remove(entityRef.curveId);
            return;
        }

        if (entityRef.kind === 'vertex') {
            this.entities.topology.vertices.remove(entityRef.vertexId);
            return;
        }

        if (entityRef.kind === 'edge') {
            this.entities.topology.edges.remove(entityRef.edgeId);
        }
    }

    public restoreEntity(snapshot: SketchEntitySnapshot): void {
        if (snapshot.store === 'points') {
            this.entities.geometry.points.add(Point2D.fromSnapshot(this.id, snapshot.value));
            return;
        }

        if (snapshot.store === 'curves') {
            this.entities.geometry.curves.add(curveFromSnapshot(this.id, snapshot.value));
            return;
        }

        if (snapshot.store === 'vertices') {
            this.entities.topology.vertices.add(Vertex.fromSnapshot(this.id, snapshot.value));
            return;
        }

        if (snapshot.store === 'edges') {
            this.entities.topology.edges.add(Edge.fromSnapshot(this.id, snapshot.value));
            return;
        }

        this.state.restore(snapshot.value);
    }

    public setTrackedProperty(
        entityRef: SketchEntityRef,
        propertyPath: readonly string[],
        value: SketchPropertyValue,
    ): void {
        if (entityRef.kind === 'point' && propertyPath[0] === 'position' && isVector2(value)) {
            const point = this.entities.geometry.points.get(entityRef.pointId);

            if (point) {
                point.position = value;
            }
            return;
        }

        if (entityRef.kind === 'sketch-state') {
            this.state.setTrackedProperty(propertyPath, value);
        }
    }
}

export class SketchEntities {
    public readonly geometry: GeometrySet;
    public readonly topology: TopologySet;

    constructor(input: { readonly geometry: GeometrySet; readonly topology: TopologySet }) {
        this.geometry = input.geometry;
        this.topology = input.topology;
    }

    public clone(): SketchEntities {
        return new SketchEntities({
            geometry: this.geometry.clone(),
            topology: this.topology.clone(),
        });
    }

    public static empty(sketchId: SketchId): SketchEntities {
        return new SketchEntities({
            geometry: GeometrySet.empty(sketchId),
            topology: TopologySet.empty(sketchId),
        });
    }
}

export class GeometrySet {
    public readonly curves: CurveStore;
    public readonly points: PointStore;

    constructor(input: { readonly curves: CurveStore; readonly points: PointStore }) {
        this.curves = input.curves;
        this.points = input.points;
    }

    public clone(): GeometrySet {
        return new GeometrySet({
            curves: this.curves.clone(),
            points: this.points.clone(),
        });
    }

    public static empty(sketchId: SketchId): GeometrySet {
        return new GeometrySet({
            curves: new CurveStore(sketchId),
            points: new PointStore(sketchId),
        });
    }
}

export class TopologySet {
    public readonly edges: EdgeStore;
    public readonly vertices: VertexStore;

    constructor(input: { readonly edges: EdgeStore; readonly vertices: VertexStore }) {
        this.edges = input.edges;
        this.vertices = input.vertices;
    }

    public clone(): TopologySet {
        return new TopologySet({
            edges: this.edges.clone(),
            vertices: this.vertices.clone(),
        });
    }

    public static empty(sketchId: SketchId): TopologySet {
        return new TopologySet({
            edges: new EdgeStore(sketchId),
            vertices: new VertexStore(sketchId),
        });
    }
}

export class PointStore {
    private readonly points = new Map<SketchPointId, Point2D>();
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId, points: readonly Point2D[] = []) {
        this.sketchId = sketchId;
        for (const point of points) {
            this.points.set(point.id, point);
        }
    }

    public add(point: Point2D): Point2D {
        this.points.set(point.id, point);
        recordSketchEntityAdded(point.ref, { store: 'points', value: point.snapshot() });

        return point;
    }

    public get(pointId: SketchPointId): Point2D | null {
        return this.points.get(pointId) ?? null;
    }

    public list(): readonly Point2D[] {
        return [...this.points.values()];
    }

    public remove(pointId: SketchPointId): Point2D | null {
        const point = this.points.get(pointId);

        if (!point) {
            return null;
        }

        this.points.delete(pointId);
        recordSketchEntityRemoved(point.ref, { store: 'points', value: point.snapshot() });

        return point;
    }

    public clone(): PointStore {
        return new PointStore(
            this.sketchId,
            this.list().map((point) => Point2D.fromSnapshot(this.sketchId, point.snapshot())),
        );
    }
}

export class CurveStore {
    private readonly curves = new Map<SketchCurveId, Curve2D>();
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId, curves: readonly Curve2D[] = []) {
        this.sketchId = sketchId;
        for (const curve of curves) {
            this.curves.set(curve.id, curve);
        }
    }

    public add(curve: Curve2D): Curve2D {
        this.curves.set(curve.id, curve);
        recordSketchEntityAdded(curve.ref, { store: 'curves', value: curve.snapshot() });

        return curve;
    }

    public get(curveId: SketchCurveId): Curve2D | null {
        return this.curves.get(curveId) ?? null;
    }

    public list(): readonly Curve2D[] {
        return [...this.curves.values()];
    }

    public remove(curveId: SketchCurveId): Curve2D | null {
        const curve = this.curves.get(curveId);

        if (!curve) {
            return null;
        }

        this.curves.delete(curveId);
        recordSketchEntityRemoved(curve.ref, { store: 'curves', value: curve.snapshot() });

        return curve;
    }

    public clone(): CurveStore {
        return new CurveStore(
            this.sketchId,
            this.list().map((curve) => curveFromSnapshot(this.sketchId, curve.snapshot())),
        );
    }
}

export class VertexStore {
    private readonly sketchId: SketchId;
    private readonly vertices = new Map<SketchVertexId, Vertex>();

    constructor(sketchId: SketchId, vertices: readonly Vertex[] = []) {
        this.sketchId = sketchId;
        for (const vertex of vertices) {
            this.vertices.set(vertex.id, vertex);
        }
    }

    public add(vertex: Vertex): Vertex {
        this.vertices.set(vertex.id, vertex);
        recordSketchEntityAdded(vertex.ref, { store: 'vertices', value: vertex.snapshot() });

        return vertex;
    }

    public get(vertexId: SketchVertexId): Vertex | null {
        return this.vertices.get(vertexId) ?? null;
    }

    public list(): readonly Vertex[] {
        return [...this.vertices.values()];
    }

    public remove(vertexId: SketchVertexId): Vertex | null {
        const vertex = this.vertices.get(vertexId);

        if (!vertex) {
            return null;
        }

        this.vertices.delete(vertexId);
        recordSketchEntityRemoved(vertex.ref, { store: 'vertices', value: vertex.snapshot() });

        return vertex;
    }

    public clone(): VertexStore {
        return new VertexStore(
            this.sketchId,
            this.list().map((vertex) => Vertex.fromSnapshot(this.sketchId, vertex.snapshot())),
        );
    }
}

export class EdgeStore {
    private readonly edges = new Map<SketchEdgeId, Edge>();
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId, edges: readonly Edge[] = []) {
        this.sketchId = sketchId;
        for (const edge of edges) {
            this.edges.set(edge.id, edge);
        }
    }

    public add(edge: Edge): Edge {
        this.edges.set(edge.id, edge);
        recordSketchEntityAdded(edge.ref, { store: 'edges', value: edge.snapshot() });

        return edge;
    }

    public get(edgeId: SketchEdgeId): Edge | null {
        return this.edges.get(edgeId) ?? null;
    }

    public list(): readonly Edge[] {
        return [...this.edges.values()];
    }

    public remove(edgeId: SketchEdgeId): Edge | null {
        const edge = this.edges.get(edgeId);

        if (!edge) {
            return null;
        }

        this.edges.delete(edgeId);
        recordSketchEntityRemoved(edge.ref, { store: 'edges', value: edge.snapshot() });

        return edge;
    }

    public clone(): EdgeStore {
        return new EdgeStore(
            this.sketchId,
            this.list().map((edge) => Edge.fromSnapshot(this.sketchId, edge.snapshot())),
        );
    }
}

export class SketchConstraints {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        this.sketchId = sketchId;
    }

    public clone(): SketchConstraints {
        return new SketchConstraints(this.sketchId);
    }
}

export class SketchDimensions {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        this.sketchId = sketchId;
    }

    public clone(): SketchDimensions {
        return new SketchDimensions(this.sketchId);
    }
}

export class SketchProfiles {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        this.sketchId = sketchId;
    }

    public clone(): SketchProfiles {
        return new SketchProfiles(this.sketchId);
    }
}

export class SketchState {
    private readonly sketchId: SketchId;
    private nextConstraintIndexValue: number;
    private nextCurveIndexValue: number;
    private nextDimensionIndexValue: number;
    private nextEdgeIndexValue: number;
    private nextPointIndexValue: number;
    private nextProfileIndexValue: number;
    private nextVertexIndexValue: number;
    private revisionValue: number;

    constructor(input: SketchStateSnapshot & { readonly sketchId: SketchId }) {
        this.nextConstraintIndexValue = input.nextConstraintIndex;
        this.nextCurveIndexValue = input.nextCurveIndex;
        this.nextDimensionIndexValue = input.nextDimensionIndex;
        this.nextEdgeIndexValue = input.nextEdgeIndex;
        this.nextPointIndexValue = input.nextPointIndex;
        this.nextProfileIndexValue = input.nextProfileIndex;
        this.nextVertexIndexValue = input.nextVertexIndex;
        this.revisionValue = input.revision;
        this.sketchId = input.sketchId;
    }

    public get revision(): number {
        return this.revisionValue;
    }

    public allocateCurveId(): SketchCurveId {
        const id = `${this.sketchId}:curve:${String(this.nextCurveIndexValue)}`;

        this.setNumberProperty('nextCurveIndex', this.nextCurveIndexValue + 1);

        return id;
    }

    public allocateEdgeId(): SketchEdgeId {
        const id = `${this.sketchId}:edge:${String(this.nextEdgeIndexValue)}`;

        this.setNumberProperty('nextEdgeIndex', this.nextEdgeIndexValue + 1);

        return id;
    }

    public allocatePointId(): SketchPointId {
        const id = `${this.sketchId}:point:${String(this.nextPointIndexValue)}`;

        this.setNumberProperty('nextPointIndex', this.nextPointIndexValue + 1);

        return id;
    }

    public allocateVertexId(): SketchVertexId {
        const id = `${this.sketchId}:vertex:${String(this.nextVertexIndexValue)}`;

        this.setNumberProperty('nextVertexIndex', this.nextVertexIndexValue + 1);

        return id;
    }

    public clone(): SketchState {
        return new SketchState({
            ...this.snapshot(),
            sketchId: this.sketchId,
        });
    }

    public incrementRevision(): void {
        this.setNumberProperty('revision', this.revisionValue + 1);
    }

    public restore(snapshot: SketchStateSnapshot): void {
        this.nextConstraintIndexValue = snapshot.nextConstraintIndex;
        this.nextCurveIndexValue = snapshot.nextCurveIndex;
        this.nextDimensionIndexValue = snapshot.nextDimensionIndex;
        this.nextEdgeIndexValue = snapshot.nextEdgeIndex;
        this.nextPointIndexValue = snapshot.nextPointIndex;
        this.nextProfileIndexValue = snapshot.nextProfileIndex;
        this.nextVertexIndexValue = snapshot.nextVertexIndex;
        this.revisionValue = snapshot.revision;
    }

    public setTrackedProperty(propertyPath: readonly string[], value: SketchPropertyValue): void {
        if (typeof value !== 'number') {
            return;
        }

        this.setNumberProperty(propertyPath[0] ?? '', value);
    }

    public snapshot(): SketchStateSnapshot {
        return {
            kind: 'sketch-state',
            nextConstraintIndex: this.nextConstraintIndexValue,
            nextCurveIndex: this.nextCurveIndexValue,
            nextDimensionIndex: this.nextDimensionIndexValue,
            nextEdgeIndex: this.nextEdgeIndexValue,
            nextPointIndex: this.nextPointIndexValue,
            nextProfileIndex: this.nextProfileIndexValue,
            nextVertexIndex: this.nextVertexIndexValue,
            revision: this.revisionValue,
        };
    }

    public static createInitial(sketchId: SketchId): SketchState {
        return new SketchState({
            kind: 'sketch-state',
            nextConstraintIndex: 1,
            nextCurveIndex: 1,
            nextDimensionIndex: 1,
            nextEdgeIndex: 1,
            nextPointIndex: 1,
            nextProfileIndex: 1,
            nextVertexIndex: 1,
            revision: 0,
            sketchId,
        });
    }

    private setNumberProperty(propertyName: string, next: number): void {
        const before = this.getNumberProperty(propertyName);

        recordSketchPropertySet({
            after: next,
            before,
            entityRef: {
                kind: 'sketch-state',
                sketchId: this.sketchId,
            },
            propertyPath: [propertyName],
        });

        this.assignNumberProperty(propertyName, next);
    }

    private assignNumberProperty(propertyName: string, value: number): void {
        if (propertyName === 'nextConstraintIndex') {
            this.nextConstraintIndexValue = value;
        } else if (propertyName === 'nextCurveIndex') {
            this.nextCurveIndexValue = value;
        } else if (propertyName === 'nextDimensionIndex') {
            this.nextDimensionIndexValue = value;
        } else if (propertyName === 'nextEdgeIndex') {
            this.nextEdgeIndexValue = value;
        } else if (propertyName === 'nextPointIndex') {
            this.nextPointIndexValue = value;
        } else if (propertyName === 'nextProfileIndex') {
            this.nextProfileIndexValue = value;
        } else if (propertyName === 'nextVertexIndex') {
            this.nextVertexIndexValue = value;
        } else if (propertyName === 'revision') {
            this.revisionValue = value;
        }
    }

    private getNumberProperty(propertyName: string): number {
        if (propertyName === 'nextConstraintIndex') {
            return this.nextConstraintIndexValue;
        }

        if (propertyName === 'nextCurveIndex') {
            return this.nextCurveIndexValue;
        }

        if (propertyName === 'nextDimensionIndex') {
            return this.nextDimensionIndexValue;
        }

        if (propertyName === 'nextEdgeIndex') {
            return this.nextEdgeIndexValue;
        }

        if (propertyName === 'nextPointIndex') {
            return this.nextPointIndexValue;
        }

        if (propertyName === 'nextProfileIndex') {
            return this.nextProfileIndexValue;
        }

        if (propertyName === 'nextVertexIndex') {
            return this.nextVertexIndexValue;
        }

        return this.revisionValue;
    }
}

export function createSketchOnReferencePlane(input: {
    readonly id: SketchId;
    readonly name: string;
    readonly planeKind: ReferencePlaneKind;
    readonly planeRef: string;
}): Sketch {
    return new Sketch({
        id: input.id,
        name: input.name,
        plane: new SketchPlane({
            planeKind: input.planeKind,
            planeRef: input.planeRef,
        }),
    });
}

export function sketchPointToWorldOnPlane(plane: Plane3, point: Vector2): Vector3 {
    return plane.localToWorld(point);
}

export function worldPointToSketchPointOnPlane(plane: Plane3, point: Vector3): Vector2 {
    return plane.projectPointToLocal(point);
}

function isVector2(value: SketchPropertyValue): value is Vector2 {
    return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
}

export function copyVector2(vector: Vector2): Vector2 {
    return Vec2.of(vector.x, vector.y);
}
