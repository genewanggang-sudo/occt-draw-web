import type { ReferencePlaneKind } from '@occt-draw/core';
import { Vec2, type Plane3, type Vector2, type Vector3 } from '@occt-draw/math';

export type SketchModuleStatus = 'active';
export type SketchId = string;
export type SketchEntityId = string;
export type SketchEntityKind = 'line' | 'point';
export type SketchPointGeomId = string;
export type SketchCurveGeomId = string;
export type SketchVertexId = string;
export type SketchEdgeId = string;
export type SketchConstraintId = string;
export type SketchDimensionId = string;
export type SketchEdgeRole = 'construction' | 'normal';

export interface SketchModuleManifest {
    readonly domain: 'sketch';
    readonly status: SketchModuleStatus;
}

export interface SketchFrame {
    readonly planeKind: ReferencePlaneKind;
    readonly planeRef: string;
}

export interface SketchPointGeom {
    readonly id: SketchPointGeomId;
    readonly position: Vector2;
}

export interface SketchLineCurveGeom {
    readonly direction: Vector2;
    readonly id: SketchCurveGeomId;
    readonly kind: 'line';
    readonly origin: Vector2;
}

export type SketchCurveGeom = SketchLineCurveGeom;

export interface SketchGeometryStore {
    readonly curves: Readonly<Record<SketchCurveGeomId, SketchCurveGeom>>;
    readonly points: Readonly<Record<SketchPointGeomId, SketchPointGeom>>;
}

export interface SketchVertex {
    readonly id: SketchVertexId;
    readonly pointId: SketchPointGeomId;
}

export interface SketchCurveParameterRange {
    readonly end: number;
    readonly start: number;
}

export interface SketchEdge {
    readonly curveId: SketchCurveGeomId;
    readonly endVertexId: SketchVertexId;
    readonly id: SketchEdgeId;
    readonly parameterRange: SketchCurveParameterRange;
    readonly role: SketchEdgeRole;
    readonly startVertexId: SketchVertexId;
}

export interface SketchTopologyGraph {
    readonly edges: Readonly<Record<SketchEdgeId, SketchEdge>>;
    readonly vertices: Readonly<Record<SketchVertexId, SketchVertex>>;
}

export interface SketchConstraintStore {
    readonly constraints: Readonly<Record<SketchConstraintId, never>>;
}

export interface SketchDimensionStore {
    readonly dimensions: Readonly<Record<SketchDimensionId, never>>;
}

export interface AddLineSegmentInput {
    readonly endPointId?: SketchPointGeomId;
    readonly endPosition: Vector2;
    readonly edgeId?: SketchEdgeId;
    readonly sketch: Sketch;
    readonly startPointId?: SketchPointGeomId;
    readonly startPosition: Vector2;
}

export interface SketchChange {
    readonly affectedRefs: readonly SketchRef[];
    readonly after: Sketch;
    readonly beforeRevision: number;
    readonly sketchId: SketchId;
}

export interface SketchPoint {
    readonly id: SketchEntityId;
    readonly kind: 'point';
    readonly x: number;
    readonly y: number;
}

export interface SketchLine {
    readonly endPointId: SketchEntityId;
    readonly id: SketchEntityId;
    readonly kind: 'line';
    readonly startPointId: SketchEntityId;
}

export type SketchEntity = SketchLine | SketchPoint;

export type SketchRef =
    | {
          readonly kind: 'sketch-vertex';
          readonly sketchId: SketchId;
          readonly vertexId: SketchVertexId;
      }
    | {
          readonly edgeId: SketchEdgeId;
          readonly kind: 'sketch-edge';
          readonly sketchId: SketchId;
      }
    | {
          readonly curveId: SketchCurveGeomId;
          readonly kind: 'sketch-curve';
          readonly sketchId: SketchId;
      }
    | {
          readonly kind: 'sketch-point';
          readonly pointId: SketchPointGeomId;
          readonly sketchId: SketchId;
      };

const EMPTY_CONSTRAINTS: SketchConstraintStore = { constraints: {} };
const EMPTY_DIMENSIONS: SketchDimensionStore = { dimensions: {} };

export class Sketch {
    public readonly constraints: SketchConstraintStore;
    public readonly dimensions: SketchDimensionStore;
    public readonly entities: readonly SketchEntity[];
    public readonly frame: SketchFrame;
    public readonly geometry: SketchGeometryStore;
    public readonly id: SketchId;
    public readonly name: string;
    public readonly planeKind: ReferencePlaneKind;
    public readonly planeRef: string;
    public readonly revision: number;
    public readonly topology: SketchTopologyGraph;

    constructor(input: {
        readonly constraints?: SketchConstraintStore;
        readonly dimensions?: SketchDimensionStore;
        readonly entities?: readonly SketchEntity[];
        readonly frame?: SketchFrame;
        readonly geometry?: SketchGeometryStore;
        readonly id: SketchId;
        readonly name: string;
        readonly planeKind?: ReferencePlaneKind;
        readonly planeRef?: string;
        readonly revision?: number;
        readonly topology?: SketchTopologyGraph;
    }) {
        const frame = normalizeSketchFrame(input);
        const stores =
            input.geometry && input.topology
                ? {
                      geometry: cloneGeometryStore(input.geometry),
                      topology: cloneTopologyGraph(input.topology),
                  }
                : migrateEntitiesToStores(input.entities ?? []);

        this.constraints = input.constraints ?? EMPTY_CONSTRAINTS;
        this.dimensions = input.dimensions ?? EMPTY_DIMENSIONS;
        this.frame = frame;
        this.geometry = stores.geometry;
        this.id = input.id;
        this.name = input.name;
        this.planeKind = frame.planeKind;
        this.planeRef = frame.planeRef;
        this.revision = input.revision ?? 0;
        this.topology = stores.topology;
        this.entities = listSketchEntitiesFromStores(this);
    }

    public addEntity(entity: SketchEntity): Sketch {
        return addSketchEntity(this, entity);
    }

    public findEntityById(id: SketchEntityId): SketchEntity | null {
        return findSketchEntityById(this, id);
    }
}

export const SKETCH_MODULE_MANIFEST: SketchModuleManifest = {
    domain: 'sketch',
    status: 'active',
} as const;

export function getSketchModuleManifest(): SketchModuleManifest {
    return SKETCH_MODULE_MANIFEST;
}

export class SketchApplicationService {
    public addLineSegment(input: AddLineSegmentInput): SketchChange {
        const startPointId = input.startPointId ?? createNextSketchId(input.sketch, 'point');
        const endPointId = input.endPointId ?? createNextSketchId(input.sketch, 'point');
        const edgeId = input.edgeId ?? createNextSketchId(input.sketch, 'line');
        const after = addSketchLineSegment(input.sketch, {
            endPointId,
            endPosition: input.endPosition,
            edgeId,
            startPointId,
            startPosition: input.startPosition,
        });

        return {
            affectedRefs: [
                {
                    kind: 'sketch-point',
                    pointId: startPointId,
                    sketchId: input.sketch.id,
                },
                {
                    kind: 'sketch-point',
                    pointId: endPointId,
                    sketchId: input.sketch.id,
                },
                {
                    edgeId,
                    kind: 'sketch-edge',
                    sketchId: input.sketch.id,
                },
            ],
            after,
            beforeRevision: input.sketch.revision,
            sketchId: input.sketch.id,
        };
    }
}

export function createSketchOnReferencePlane(input: {
    readonly id: SketchId;
    readonly name: string;
    readonly planeKind: ReferencePlaneKind;
    readonly planeRef: string;
}): Sketch {
    return new Sketch({
        frame: {
            planeKind: input.planeKind,
            planeRef: input.planeRef,
        },
        id: input.id,
        name: input.name,
    });
}

export function createSketchPoint(input: {
    readonly id: SketchEntityId;
    readonly x: number;
    readonly y: number;
}): SketchPoint {
    return {
        id: input.id,
        kind: 'point',
        x: input.x,
        y: input.y,
    };
}

export function createSketchLine(input: {
    readonly endPointId: SketchEntityId;
    readonly id: SketchEntityId;
    readonly startPointId: SketchEntityId;
}): SketchLine {
    return {
        endPointId: input.endPointId,
        id: input.id,
        kind: 'line',
        startPointId: input.startPointId,
    };
}

export function addSketchEntity(sketch: Sketch, entity: SketchEntity): Sketch {
    return entity.kind === 'point' ? addSketchPoint(sketch, entity) : addSketchLine(sketch, entity);
}

export function addSketchLineSegment(
    sketch: Sketch,
    input: {
        readonly endPointId: SketchPointGeomId;
        readonly endPosition: Vector2;
        readonly edgeId: SketchEdgeId;
        readonly startPointId: SketchPointGeomId;
        readonly startPosition: Vector2;
    },
): Sketch {
    const start = {
        id: input.startPointId,
        position: Vec2.of(input.startPosition.x, input.startPosition.y),
    };
    const end = {
        id: input.endPointId,
        position: Vec2.of(input.endPosition.x, input.endPosition.y),
    };
    const curveId = toLineCurveId(input.edgeId);
    const geometry: SketchGeometryStore = {
        curves: {
            ...sketch.geometry.curves,
            [curveId]: {
                direction: normalizeLineDirection(start.position, end.position),
                id: curveId,
                kind: 'line',
                origin: start.position,
            },
        },
        points: {
            ...sketch.geometry.points,
            [start.id]: start,
            [end.id]: end,
        },
    };
    const topology: SketchTopologyGraph = {
        edges: {
            ...sketch.topology.edges,
            [input.edgeId]: {
                curveId,
                endVertexId: end.id,
                id: input.edgeId,
                parameterRange: {
                    end: Vec2.distance(start.position, end.position),
                    start: 0,
                },
                role: 'normal',
                startVertexId: start.id,
            },
        },
        vertices: {
            ...sketch.topology.vertices,
            [start.id]: {
                id: start.id,
                pointId: start.id,
            },
            [end.id]: {
                id: end.id,
                pointId: end.id,
            },
        },
    };

    return createNextSketch(sketch, geometry, topology);
}

export function removeSketchEntity(sketch: Sketch, id: SketchEntityId): Sketch {
    const geometry: SketchGeometryStore = {
        curves: Object.fromEntries(
            Object.entries(sketch.geometry.curves).filter(
                ([curveId]) => curveId !== toLineCurveId(id),
            ),
        ),
        points: Object.fromEntries(
            Object.entries(sketch.geometry.points).filter(([pointId]) => pointId !== id),
        ),
    };
    const topology: SketchTopologyGraph = {
        edges: Object.fromEntries(
            Object.entries(sketch.topology.edges).filter(
                ([edgeId, edge]) =>
                    edgeId !== id && edge.startVertexId !== id && edge.endVertexId !== id,
            ),
        ),
        vertices: Object.fromEntries(
            Object.entries(sketch.topology.vertices).filter(([vertexId]) => vertexId !== id),
        ),
    };

    return createNextSketch(sketch, geometry, topology);
}

export function findSketchEntityById(sketch: Sketch, id: SketchEntityId): SketchEntity | null {
    return listSketchEntitiesFromStores(sketch).find((entity) => entity.id === id) ?? null;
}

export function listSketchLines(sketch: Sketch): readonly SketchLine[] {
    return Object.values(sketch.topology.edges).map((edge) => ({
        endPointId: sketch.topology.vertices[edge.endVertexId]?.pointId ?? edge.endVertexId,
        id: edge.id,
        kind: 'line',
        startPointId: sketch.topology.vertices[edge.startVertexId]?.pointId ?? edge.startVertexId,
    }));
}

export function listSketchPoints(sketch: Sketch): readonly SketchPoint[] {
    return Object.values(sketch.geometry.points).map(pointGeomToSketchPoint);
}

export function findSketchPointById(sketch: Sketch, id: SketchEntityId): SketchPoint | null {
    const point = sketch.geometry.points[id];

    return point ? pointGeomToSketchPoint(point) : null;
}

export function findSketchEdgeById(sketch: Sketch, id: SketchEdgeId): SketchEdge | null {
    return sketch.topology.edges[id] ?? null;
}

export function sketchPointToWorldOnPlane(plane: Plane3, point: SketchPoint): Vector3 {
    return plane.localToWorld(point);
}

export function worldPointToSketchPointOnPlane(plane: Plane3, point: Vector3): Vector2 {
    return plane.projectPointToLocal(point);
}

function addSketchPoint(sketch: Sketch, point: SketchPoint): Sketch {
    const geometry: SketchGeometryStore = {
        curves: sketch.geometry.curves,
        points: {
            ...sketch.geometry.points,
            [point.id]: {
                id: point.id,
                position: Vec2.of(point.x, point.y),
            },
        },
    };
    const topology: SketchTopologyGraph = {
        edges: sketch.topology.edges,
        vertices: {
            ...sketch.topology.vertices,
            [point.id]: {
                id: point.id,
                pointId: point.id,
            },
        },
    };

    return createNextSketch(sketch, geometry, topology);
}

function addSketchLine(sketch: Sketch, line: SketchLine): Sketch {
    const start = sketch.geometry.points[line.startPointId];
    const end = sketch.geometry.points[line.endPointId];

    if (!start || !end) {
        return sketch;
    }

    const curveId = toLineCurveId(line.id);
    const geometry: SketchGeometryStore = {
        curves: {
            ...sketch.geometry.curves,
            [curveId]: {
                direction: normalizeLineDirection(start.position, end.position),
                id: curveId,
                kind: 'line',
                origin: start.position,
            },
        },
        points: sketch.geometry.points,
    };
    const topology: SketchTopologyGraph = {
        edges: {
            ...sketch.topology.edges,
            [line.id]: {
                curveId,
                endVertexId: line.endPointId,
                id: line.id,
                parameterRange: {
                    end: Vec2.distance(start.position, end.position),
                    start: 0,
                },
                role: 'normal',
                startVertexId: line.startPointId,
            },
        },
        vertices: sketch.topology.vertices,
    };

    return createNextSketch(sketch, geometry, topology);
}

function createNextSketch(
    sketch: Sketch,
    geometry: SketchGeometryStore,
    topology: SketchTopologyGraph,
): Sketch {
    return new Sketch({
        constraints: sketch.constraints,
        dimensions: sketch.dimensions,
        frame: sketch.frame,
        geometry,
        id: sketch.id,
        name: sketch.name,
        revision: sketch.revision + 1,
        topology,
    });
}

function migrateEntitiesToStores(entities: readonly SketchEntity[]): {
    readonly geometry: SketchGeometryStore;
    readonly topology: SketchTopologyGraph;
} {
    return entities.reduce(
        (stores, entity) => {
            const sketch = new Sketch({
                frame: {
                    planeKind: 'xy',
                    planeRef: '__migration__',
                },
                geometry: stores.geometry,
                id: '__migration__',
                name: '__migration__',
                topology: stores.topology,
            });
            const nextSketch = addSketchEntity(sketch, entity);

            return {
                geometry: nextSketch.geometry,
                topology: nextSketch.topology,
            };
        },
        {
            geometry: {
                curves: {},
                points: {},
            },
            topology: {
                edges: {},
                vertices: {},
            },
        },
    );
}

function listSketchEntitiesFromStores(sketch: Sketch): readonly SketchEntity[] {
    return [...listSketchPoints(sketch), ...listSketchLines(sketch)];
}

function pointGeomToSketchPoint(point: SketchPointGeom): SketchPoint {
    return {
        id: point.id,
        kind: 'point',
        x: point.position.x,
        y: point.position.y,
    };
}

function normalizeSketchFrame(input: {
    readonly frame?: SketchFrame;
    readonly planeKind?: ReferencePlaneKind;
    readonly planeRef?: string;
}): SketchFrame {
    if (input.frame) {
        return input.frame;
    }

    if (!input.planeKind || !input.planeRef) {
        throw new Error('Sketch requires a frame or planeKind + planeRef.');
    }

    return {
        planeKind: input.planeKind,
        planeRef: input.planeRef,
    };
}

function cloneGeometryStore(geometry: SketchGeometryStore): SketchGeometryStore {
    return {
        curves: { ...geometry.curves },
        points: { ...geometry.points },
    };
}

function cloneTopologyGraph(topology: SketchTopologyGraph): SketchTopologyGraph {
    return {
        edges: { ...topology.edges },
        vertices: { ...topology.vertices },
    };
}

function normalizeLineDirection(start: Vector2, end: Vector2): Vector2 {
    const direction = Vec2.subtract(end, start);
    const length = Vec2.length(direction);

    return length > 0 ? Vec2.scale(direction, 1 / length) : Vec2.of(1, 0);
}

function toLineCurveId(edgeId: SketchEdgeId): SketchCurveGeomId {
    return `${edgeId}:curve`;
}

function createNextSketchId(sketch: Sketch, kind: 'line' | 'point'): SketchEntityId {
    const count = sketch.entities.filter((entity) => entity.kind === kind).length + 1;

    return `${sketch.id}:${kind}:${String(count)}`;
}
