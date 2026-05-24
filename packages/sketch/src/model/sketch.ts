import {
    BaseModelEntity,
    ModelEntityStore,
    ModelPropertyBag,
    type ModelPropertyValue,
} from '@occt-draw/core';
import { Vec2, type Plane3, type Vector2, type Vector3 } from '@occt-draw/math';
import {
    recordSketchEntityAdded,
    recordSketchEntityRemoved,
    recordSketchPropertySet,
} from '../changes/changeTracking';
import { curveFromSnapshot, Point2D, type Curve2D } from '../geometry/geometry';
import { Edge, Vertex } from '../topology/topology';
import {
    SketchEntityKind,
    type SketchCurveId,
    type SketchEdgeId,
    type SketchEntityRef,
    type SketchEntitySnapshot,
    type SketchId,
    type SketchPlaneKind,
    type SketchPlaneInput,
    type SketchPlaneObjectRef,
    type SketchPointId,
    type SketchPropertyValue,
    type SketchStateSnapshot,
    type SketchVertexId,
} from '../types';

export class SketchPlane extends BaseModelEntity {
    public readonly planeKind: SketchPlaneKind;
    public readonly planeObjectRef: SketchPlaneObjectRef;

    constructor(input: SketchPlaneInput) {
        super({
            id: input.planeObjectRef.id,
            modelType: 'sketch.plane',
            name: input.planeKind,
            properties: new Map<string, ModelPropertyValue>([
                ['planeKind', input.planeKind],
                ['planeObjectRef', input.planeObjectRef],
            ]),
        });
        this.planeKind = input.planeKind;
        this.planeObjectRef = input.planeObjectRef;
    }
}

export class Sketch extends BaseModelEntity {
    public readonly constraints: SketchConstraints;
    public readonly dimensions: SketchDimensions;
    public readonly entities: SketchEntities;
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
        super({
            id: input.id,
            modelType: 'sketch.document',
            name: input.name,
            properties: new Map<string, ModelPropertyValue>([
                ['planeKind', input.plane.planeKind],
                ['planeObjectRef', input.plane.planeObjectRef],
            ]),
        });
        this.constraints = input.constraints ?? new SketchConstraints(input.id);
        this.dimensions = input.dimensions ?? new SketchDimensions(input.id);
        this.entities = input.entities ?? SketchEntities.empty(input.id);
        this.plane = input.plane;
        this.profiles = input.profiles ?? new SketchProfiles(input.id);
        this.state = input.state ?? SketchState.createInitial(input.id);
    }

    public get planeKind(): SketchPlaneKind {
        return this.plane.planeKind;
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
        if (entityRef.kind === SketchEntityKind.Point) {
            this.entities.geometry.points.remove(entityRef.id);
            return;
        }

        if (entityRef.kind === SketchEntityKind.Curve) {
            this.entities.geometry.curves.remove(entityRef.id);
            return;
        }

        if (entityRef.kind === SketchEntityKind.Vertex) {
            this.entities.topology.vertices.remove(entityRef.id);
            return;
        }

        if (entityRef.kind === SketchEntityKind.Edge) {
            this.entities.topology.edges.remove(entityRef.id);
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
        if (
            entityRef.kind === SketchEntityKind.Point &&
            propertyPath[0] === 'position' &&
            isVector2(value)
        ) {
            const point = this.entities.geometry.points.get(entityRef.id);

            if (point) {
                point.position = value;
            }
            return;
        }

        if (entityRef.kind === SketchEntityKind.SketchState) {
            this.state.setTrackedProperty(propertyPath, value);
        }
    }
}

export class SketchEntities extends BaseModelEntity {
    public readonly geometry: GeometrySet;
    public readonly topology: TopologySet;
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly geometry: GeometrySet;
        readonly sketchId: SketchId;
        readonly topology: TopologySet;
    }) {
        super({
            id: `${input.sketchId}:entities`,
            modelType: 'sketch.entities',
            name: `${input.sketchId}:entities`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', input.sketchId]]),
        });
        this.geometry = input.geometry;
        this.sketchId = input.sketchId;
        this.topology = input.topology;
    }

    public clone(): SketchEntities {
        return new SketchEntities({
            geometry: this.geometry.clone(),
            sketchId: this.sketchId,
            topology: this.topology.clone(),
        });
    }

    public static empty(sketchId: SketchId): SketchEntities {
        return new SketchEntities({
            geometry: GeometrySet.empty(sketchId),
            sketchId,
            topology: TopologySet.empty(sketchId),
        });
    }
}

export class GeometrySet extends BaseModelEntity {
    public readonly curves: CurveStore;
    public readonly points: PointStore;
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly curves: CurveStore;
        readonly points: PointStore;
        readonly sketchId: SketchId;
    }) {
        super({
            id: `${input.sketchId}:geometry`,
            modelType: 'sketch.geometry',
            name: `${input.sketchId}:geometry`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', input.sketchId]]),
        });
        this.curves = input.curves;
        this.points = input.points;
        this.sketchId = input.sketchId;
    }

    public clone(): GeometrySet {
        return new GeometrySet({
            curves: this.curves.clone(),
            points: this.points.clone(),
            sketchId: this.sketchId,
        });
    }

    public static empty(sketchId: SketchId): GeometrySet {
        return new GeometrySet({
            curves: new CurveStore(sketchId),
            points: new PointStore(sketchId),
            sketchId,
        });
    }
}

export class TopologySet extends BaseModelEntity {
    public readonly edges: EdgeStore;
    private readonly sketchId: SketchId;
    public readonly vertices: VertexStore;

    constructor(input: {
        readonly edges: EdgeStore;
        readonly sketchId: SketchId;
        readonly vertices: VertexStore;
    }) {
        super({
            id: `${input.sketchId}:topology`,
            modelType: 'sketch.topology',
            name: `${input.sketchId}:topology`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', input.sketchId]]),
        });
        this.edges = input.edges;
        this.sketchId = input.sketchId;
        this.vertices = input.vertices;
    }

    public clone(): TopologySet {
        return new TopologySet({
            edges: this.edges.clone(),
            sketchId: this.sketchId,
            vertices: this.vertices.clone(),
        });
    }

    public static empty(sketchId: SketchId): TopologySet {
        return new TopologySet({
            edges: new EdgeStore(sketchId),
            sketchId,
            vertices: new VertexStore(sketchId),
        });
    }
}

abstract class SketchEntityStore<
    TEntityId extends string,
    TEntity extends BaseModelEntity<TEntityId> & { readonly ref: SketchEntityRef },
    TSnapshot extends SketchEntitySnapshot,
> {
    protected readonly sketchId: SketchId;
    private store: ModelEntityStore<TEntity, TEntityId>;

    protected constructor(input: {
        readonly entities: readonly TEntity[];
        readonly sketchId: SketchId;
    }) {
        this.sketchId = input.sketchId;
        this.store = ModelEntityStore.fromEntities(input.entities);
    }

    public add(entity: TEntity): TEntity {
        this.store = this.store.set(entity);
        recordSketchEntityAdded(entity.ref, this.snapshot(entity));

        return entity;
    }

    public get(id: TEntityId): TEntity | null {
        return this.store.find(id);
    }

    public list(): readonly TEntity[] {
        return this.store.list();
    }

    public remove(id: TEntityId): TEntity | null {
        const entity = this.store.find(id);

        if (!entity) {
            return null;
        }

        this.store = this.store.remove(id);
        recordSketchEntityRemoved(entity.ref, this.snapshot(entity));

        return entity;
    }

    protected abstract snapshot(entity: TEntity): TSnapshot;
}

export class PointStore extends SketchEntityStore<
    SketchPointId,
    Point2D,
    Extract<SketchEntitySnapshot, { readonly store: 'points' }>
> {
    constructor(sketchId: SketchId, points: readonly Point2D[] = []) {
        super({ entities: points, sketchId });
    }

    public clone(): PointStore {
        return new PointStore(
            this.sketchId,
            this.list().map((point) => Point2D.fromSnapshot(this.sketchId, point.snapshot())),
        );
    }

    protected snapshot(
        point: Point2D,
    ): Extract<SketchEntitySnapshot, { readonly store: 'points' }> {
        return { store: 'points', value: point.snapshot() };
    }
}

export class CurveStore extends SketchEntityStore<
    SketchCurveId,
    Curve2D,
    Extract<SketchEntitySnapshot, { readonly store: 'curves' }>
> {
    constructor(sketchId: SketchId, curves: readonly Curve2D[] = []) {
        super({ entities: curves, sketchId });
    }

    public clone(): CurveStore {
        return new CurveStore(
            this.sketchId,
            this.list().map((curve) => curveFromSnapshot(this.sketchId, curve.snapshot())),
        );
    }

    protected snapshot(
        curve: Curve2D,
    ): Extract<SketchEntitySnapshot, { readonly store: 'curves' }> {
        return { store: 'curves', value: curve.snapshot() };
    }
}

export class VertexStore extends SketchEntityStore<
    SketchVertexId,
    Vertex,
    Extract<SketchEntitySnapshot, { readonly store: 'vertices' }>
> {
    constructor(sketchId: SketchId, vertices: readonly Vertex[] = []) {
        super({ entities: vertices, sketchId });
    }

    public clone(): VertexStore {
        return new VertexStore(
            this.sketchId,
            this.list().map((vertex) => Vertex.fromSnapshot(this.sketchId, vertex.snapshot())),
        );
    }

    protected snapshot(
        vertex: Vertex,
    ): Extract<SketchEntitySnapshot, { readonly store: 'vertices' }> {
        return { store: 'vertices', value: vertex.snapshot() };
    }
}

export class EdgeStore extends SketchEntityStore<
    SketchEdgeId,
    Edge,
    Extract<SketchEntitySnapshot, { readonly store: 'edges' }>
> {
    constructor(sketchId: SketchId, edges: readonly Edge[] = []) {
        super({ entities: edges, sketchId });
    }

    public clone(): EdgeStore {
        return new EdgeStore(
            this.sketchId,
            this.list().map((edge) => Edge.fromSnapshot(this.sketchId, edge.snapshot())),
        );
    }

    protected snapshot(edge: Edge): Extract<SketchEntitySnapshot, { readonly store: 'edges' }> {
        return { store: 'edges', value: edge.snapshot() };
    }
}

export class SketchConstraints extends BaseModelEntity {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        super({
            id: `${sketchId}:constraints`,
            modelType: 'sketch.constraints',
            name: `${sketchId}:constraints`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', sketchId]]),
        });
        this.sketchId = sketchId;
    }

    public clone(): SketchConstraints {
        return new SketchConstraints(this.sketchId);
    }
}

export class SketchDimensions extends BaseModelEntity {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        super({
            id: `${sketchId}:dimensions`,
            modelType: 'sketch.dimensions',
            name: `${sketchId}:dimensions`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', sketchId]]),
        });
        this.sketchId = sketchId;
    }

    public clone(): SketchDimensions {
        return new SketchDimensions(this.sketchId);
    }
}

export class SketchProfiles extends BaseModelEntity {
    private readonly sketchId: SketchId;

    constructor(sketchId: SketchId) {
        super({
            id: `${sketchId}:profiles`,
            modelType: 'sketch.profiles',
            name: `${sketchId}:profiles`,
            properties: new Map<string, ModelPropertyValue>([['sketchId', sketchId]]),
        });
        this.sketchId = sketchId;
    }

    public clone(): SketchProfiles {
        return new SketchProfiles(this.sketchId);
    }
}

type SketchStateNumberProperty = Exclude<keyof SketchStateSnapshot, 'kind'>;

const SKETCH_STATE_NUMBER_PROPERTIES: readonly SketchStateNumberProperty[] = [
    'nextConstraintIndex',
    'nextCurveIndex',
    'nextDimensionIndex',
    'nextEdgeIndex',
    'nextPointIndex',
    'nextProfileIndex',
    'nextVertexIndex',
    'revision',
];

export class SketchState extends BaseModelEntity {
    private readonly sketchId: SketchId;

    constructor(input: SketchStateSnapshot & { readonly sketchId: SketchId }) {
        const properties = createSketchStateProperties(input);

        super({
            id: input.sketchId,
            modelType: 'sketch.state',
            name: `${input.sketchId}:state`,
            properties,
        });
        this.sketchId = input.sketchId;
    }

    public get revision(): number {
        return this.readNumberProperty('revision');
    }

    public allocateCurveId(): SketchCurveId {
        const nextCurveIndex = this.readNumberProperty('nextCurveIndex');
        const id = `${this.sketchId}:curve:${String(nextCurveIndex)}`;

        this.setNumberProperty('nextCurveIndex', nextCurveIndex + 1);

        return id;
    }

    public allocateEdgeId(): SketchEdgeId {
        const nextEdgeIndex = this.readNumberProperty('nextEdgeIndex');
        const id = `${this.sketchId}:edge:${String(nextEdgeIndex)}`;

        this.setNumberProperty('nextEdgeIndex', nextEdgeIndex + 1);

        return id;
    }

    public allocatePointId(): SketchPointId {
        const nextPointIndex = this.readNumberProperty('nextPointIndex');
        const id = `${this.sketchId}:point:${String(nextPointIndex)}`;

        this.setNumberProperty('nextPointIndex', nextPointIndex + 1);

        return id;
    }

    public allocateVertexId(): SketchVertexId {
        const nextVertexIndex = this.readNumberProperty('nextVertexIndex');
        const id = `${this.sketchId}:vertex:${String(nextVertexIndex)}`;

        this.setNumberProperty('nextVertexIndex', nextVertexIndex + 1);

        return id;
    }

    public clone(): SketchState {
        return new SketchState({
            ...this.snapshot(),
            sketchId: this.sketchId,
        });
    }

    public incrementRevision(): void {
        this.setNumberProperty('revision', this.revision + 1);
    }

    public restore(snapshot: SketchStateSnapshot): void {
        const properties = createSketchStateProperties({
            ...snapshot,
            sketchId: this.sketchId,
        });

        for (const [key, value] of properties.entries()) {
            this.setPropertyValue(key, value);
        }
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
            nextConstraintIndex: this.readNumberProperty('nextConstraintIndex'),
            nextCurveIndex: this.readNumberProperty('nextCurveIndex'),
            nextDimensionIndex: this.readNumberProperty('nextDimensionIndex'),
            nextEdgeIndex: this.readNumberProperty('nextEdgeIndex'),
            nextPointIndex: this.readNumberProperty('nextPointIndex'),
            nextProfileIndex: this.readNumberProperty('nextProfileIndex'),
            nextVertexIndex: this.readNumberProperty('nextVertexIndex'),
            revision: this.revision,
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
        const before = this.readNumberProperty(propertyName);

        recordSketchPropertySet({
            after: next,
            before,
            entityRef: {
                id: this.sketchId,
                kind: SketchEntityKind.SketchState,
                ownerId: this.sketchId,
                sketchId: this.sketchId,
            },
            propertyPath: [propertyName],
        });

        this.assignNumberProperty(propertyName, next);
    }

    private assignNumberProperty(propertyName: string, value: number): void {
        this.setPropertyValue(propertyName, value);
    }

    private readNumberProperty(propertyName: string): number {
        return this.getNumberProperty(propertyName);
    }
}

function createSketchStateProperties(
    input: SketchStateSnapshot & { readonly sketchId: SketchId },
): ModelPropertyBag {
    let properties = new ModelPropertyBag();

    for (const propertyName of SKETCH_STATE_NUMBER_PROPERTIES) {
        properties = properties.set(propertyName, input[propertyName]);
    }

    return properties;
}

export function createSketchOnReferencePlane(input: {
    readonly id: SketchId;
    readonly name: string;
    readonly planeKind: SketchPlaneKind;
    readonly planeObjectRef: SketchPlaneObjectRef;
}): Sketch {
    return new Sketch({
        id: input.id,
        name: input.name,
        plane: new SketchPlane({
            planeKind: input.planeKind,
            planeObjectRef: input.planeObjectRef,
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
