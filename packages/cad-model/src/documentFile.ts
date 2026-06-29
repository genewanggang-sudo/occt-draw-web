import {
    DocumentFileError,
    createJsonDocumentFileCodec,
    createModelRef,
    type DocumentFileCodec,
    type DocumentId,
} from '@occt-draw/core';
import {
    CurveStore,
    Edge,
    EdgeStore,
    GeometrySet,
    Point2D,
    PointStore,
    Sketch,
    SketchEntities,
    SketchPlane,
    SketchState,
    TopologySet,
    Vertex,
    VertexStore,
    curveFromSnapshot,
    type Curve2DSnapshot,
    type EdgeSnapshot,
    type Point2DSnapshot,
    type SketchPlaneKind,
    type SketchStateSnapshot,
    type VertexSnapshot,
} from '@occt-draw/sketch';
import { CadDocument, FeaturePayloadStore, PartStudio, type FeaturePayload } from './document';
import {
    Feature,
    createFeaturePayloadRef,
    type FeatureStatus,
    type FeatureTypeId,
} from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';
import {
    ReferenceOriginObject,
    ReferencePlaneObject,
    type CadObject,
    type ReferencePlaneKind,
} from './objects';

export const CAD_DOCUMENT_FORMAT_ID = 'occt-draw.cad-document';
export const CAD_DOCUMENT_FORMAT_VERSION = 1;

export interface CadDocumentSnapshot {
    readonly activePartStudioId: PartStudioId;
    readonly id: DocumentId;
    readonly name: string;
    readonly partStudios: readonly PartStudioSnapshot[];
    readonly revision: number;
}

export interface PartStudioSnapshot {
    readonly featurePayloads: readonly CadFeaturePayloadSnapshot[];
    readonly features: readonly CadFeatureSnapshot[];
    readonly id: PartStudioId;
    readonly name: string;
    readonly objects: readonly CadObjectSnapshot[];
    readonly revision: number;
}

export interface CadFeatureSnapshot {
    readonly id: string;
    readonly name: string;
    readonly payloadRef: {
        readonly id: FeaturePayloadId;
        readonly kind: 'cad.feature-payload';
    } | null;
    readonly status: FeatureStatus;
    readonly suppressed: boolean;
    readonly type: FeatureTypeId;
}

export type CadObjectSnapshot =
    | {
          readonly id: string;
          readonly kind: 'reference-origin';
          readonly name: string;
          readonly position: Vector3Snapshot;
          readonly visible: boolean;
      }
    | {
          readonly id: string;
          readonly kind: 'reference-plane';
          readonly name: string;
          readonly normal: Vector3Snapshot;
          readonly origin: Vector3Snapshot;
          readonly planeKind: ReferencePlaneKind;
          readonly size: number;
          readonly visible: boolean;
          readonly xAxis: Vector3Snapshot;
      };

export interface CadFeaturePayloadSnapshot {
    readonly id: FeaturePayloadId;
    readonly kind: 'sketch';
    readonly value: CadSketchSnapshot;
}

export interface CadSketchSnapshot {
    readonly curves: readonly Curve2DSnapshot[];
    readonly edges: readonly EdgeSnapshot[];
    readonly id: string;
    readonly name: string;
    readonly plane: {
        readonly planeKind: SketchPlaneKind;
        readonly planeObjectRef: {
            readonly id: string;
            readonly kind: 'cad.object.reference-plane';
        };
    };
    readonly points: readonly Point2DSnapshot[];
    readonly revision: number;
    readonly state: SketchStateSnapshot;
    readonly vertices: readonly VertexSnapshot[];
}

export interface Vector3Snapshot {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export const cadDocumentFileCodec: DocumentFileCodec<CadDocument, CadDocumentSnapshot> =
    createJsonDocumentFileCodec({
        deserialize: deserializeCadDocument,
        formatId: CAD_DOCUMENT_FORMAT_ID,
        formatVersion: CAD_DOCUMENT_FORMAT_VERSION,
        serialize: serializeCadDocument,
    });

export function serializeCadDocument(document: CadDocument): CadDocumentSnapshot {
    return {
        activePartStudioId: document.activePartStudioId,
        id: document.id,
        name: document.name,
        partStudios: document.partStudios.map(serializePartStudio),
        revision: document.revision,
    };
}

export function deserializeCadDocument(snapshot: CadDocumentSnapshot): CadDocument {
    assertRecord(snapshot, 'CAD document snapshot must be an object.');

    return new CadDocument({
        activePartStudioId: readString(snapshot, 'activePartStudioId'),
        id: readString(snapshot, 'id'),
        name: readString(snapshot, 'name'),
        partStudios: readArray(snapshot, 'partStudios').map(deserializePartStudio),
        revision: readNumber(snapshot, 'revision'),
    });
}

function serializePartStudio(partStudio: PartStudio): PartStudioSnapshot {
    return {
        featurePayloads: partStudio.featurePayloads
            .list()
            .map(([payloadId, payload]) => serializeFeaturePayload(payloadId, payload)),
        features: partStudio.features.map(serializeFeature),
        id: partStudio.id,
        name: partStudio.name,
        objects: partStudio.objects.map(serializeCadObject),
        revision: partStudio.revision,
    };
}

function deserializePartStudio(snapshot: unknown): PartStudio {
    assertRecord(snapshot, 'Part studio snapshot must be an object.');

    return new PartStudio({
        featurePayloads: new FeaturePayloadStore(
            readArray(snapshot, 'featurePayloads').map(deserializeFeaturePayload),
        ),
        features: readArray(snapshot, 'features').map(deserializeFeature),
        id: readString(snapshot, 'id'),
        name: readString(snapshot, 'name'),
        objects: readArray(snapshot, 'objects').map(deserializeCadObject),
        revision: readNumber(snapshot, 'revision'),
    });
}

function serializeFeature(feature: Feature): CadFeatureSnapshot {
    return {
        id: feature.id,
        name: feature.name,
        payloadRef: feature.payloadRef,
        status: feature.status,
        suppressed: feature.suppressed,
        type: feature.type,
    };
}

function deserializeFeature(snapshot: unknown): Feature {
    assertRecord(snapshot, 'Feature snapshot must be an object.');

    return new Feature({
        id: readString(snapshot, 'id'),
        name: readString(snapshot, 'name'),
        payloadRef: deserializeFeaturePayloadRef(snapshot.payloadRef),
        status: readFeatureStatus(snapshot.status),
        suppressed: readBoolean(snapshot, 'suppressed'),
        type: readFeatureType(snapshot.type),
    });
}

function serializeCadObject(object: CadObject): CadObjectSnapshot {
    if (object.kind === 'reference-origin') {
        return {
            id: object.id,
            kind: object.kind,
            name: object.name,
            position: object.position,
            visible: object.visible,
        };
    }

    return {
        id: object.id,
        kind: object.kind,
        name: object.name,
        normal: object.normal,
        origin: object.origin,
        planeKind: object.planeKind,
        size: object.size,
        visible: object.visible,
        xAxis: object.xAxis,
    };
}

function deserializeCadObject(snapshot: unknown): CadObject {
    assertRecord(snapshot, 'CAD object snapshot must be an object.');

    const kind = readString(snapshot, 'kind');

    if (kind === 'reference-origin') {
        return new ReferenceOriginObject({
            id: readString(snapshot, 'id'),
            name: readString(snapshot, 'name'),
            position: readVector3(snapshot.position, 'position'),
            visible: readBoolean(snapshot, 'visible'),
        });
    }

    if (kind === 'reference-plane') {
        return new ReferencePlaneObject({
            id: readString(snapshot, 'id'),
            name: readString(snapshot, 'name'),
            normal: readVector3(snapshot.normal, 'normal'),
            origin: readVector3(snapshot.origin, 'origin'),
            planeKind: readReferencePlaneKind(snapshot.planeKind),
            size: readNumber(snapshot, 'size'),
            visible: readBoolean(snapshot, 'visible'),
            xAxis: readVector3(snapshot.xAxis, 'xAxis'),
        });
    }

    throw invalidDocument(`Unsupported CAD object kind "${kind}".`);
}

function serializeFeaturePayload(
    payloadId: FeaturePayloadId,
    payload: FeaturePayload,
): CadFeaturePayloadSnapshot {
    if (payload instanceof Sketch) {
        return {
            id: payloadId,
            kind: 'sketch',
            value: serializeSketch(payload),
        };
    }

    throw invalidDocument(`Unsupported feature payload "${payloadId}".`);
}

function deserializeFeaturePayload(snapshot: unknown): readonly [FeaturePayloadId, FeaturePayload] {
    assertRecord(snapshot, 'Feature payload snapshot must be an object.');

    const id = readString(snapshot, 'id');
    const kind = readString(snapshot, 'kind');

    if (kind === 'sketch') {
        return [id, deserializeSketch(snapshot.value)];
    }

    throw invalidDocument(`Unsupported feature payload kind "${kind}".`);
}

function serializeSketch(sketch: Sketch): CadSketchSnapshot {
    return {
        curves: sketch.entities.geometry.curves.list().map((curve) => curve.snapshot()),
        edges: sketch.entities.topology.edges.list().map((edge) => edge.snapshot()),
        id: sketch.id,
        name: sketch.name,
        plane: {
            planeKind: sketch.plane.planeKind,
            planeObjectRef: sketch.plane.planeObjectRef,
        },
        points: sketch.entities.geometry.points.list().map((point) => point.snapshot()),
        revision: sketch.revision,
        state: sketch.state.snapshot(),
        vertices: sketch.entities.topology.vertices.list().map((vertex) => vertex.snapshot()),
    };
}

function deserializeSketch(snapshot: unknown): Sketch {
    assertRecord(snapshot, 'Sketch snapshot must be an object.');
    assertRecord(snapshot.plane, 'Sketch plane snapshot must be an object.');
    assertRecord(snapshot.plane.planeObjectRef, 'Sketch plane object ref must be an object.');

    const sketchId = readString(snapshot, 'id');

    return new Sketch({
        entities: new SketchEntities({
            geometry: new GeometrySet({
                curves: new CurveStore(
                    sketchId,
                    readArray(snapshot, 'curves').map((curve) =>
                        curveFromSnapshot(sketchId, curve as Curve2DSnapshot),
                    ),
                ),
                points: new PointStore(
                    sketchId,
                    readArray(snapshot, 'points').map((point) =>
                        Point2D.fromSnapshot(sketchId, point as Point2DSnapshot),
                    ),
                ),
                sketchId,
            }),
            sketchId,
            topology: new TopologySet({
                edges: new EdgeStore(
                    sketchId,
                    readArray(snapshot, 'edges').map((edge) =>
                        Edge.fromSnapshot(sketchId, edge as EdgeSnapshot),
                    ),
                ),
                sketchId,
                vertices: new VertexStore(
                    sketchId,
                    readArray(snapshot, 'vertices').map((vertex) =>
                        Vertex.fromSnapshot(sketchId, vertex as VertexSnapshot),
                    ),
                ),
            }),
        }),
        id: sketchId,
        name: readString(snapshot, 'name'),
        plane: new SketchPlane({
            planeKind: readSketchPlaneKind(snapshot.plane.planeKind),
            planeObjectRef: createModelRef({
                id: readString(snapshot.plane.planeObjectRef, 'id'),
                kind: 'cad.object.reference-plane',
            }),
        }),
        revision: readNumber(snapshot, 'revision'),
        state: new SketchState({
            ...(snapshot.state as SketchStateSnapshot),
            sketchId,
        }),
    });
}

function deserializeFeaturePayloadRef(
    value: unknown,
): ReturnType<typeof createFeaturePayloadRef> | null {
    if (value === null) {
        return null;
    }

    assertRecord(value, 'Feature payload ref must be an object.');

    if (value.kind !== 'cad.feature-payload') {
        throw invalidDocument('Feature payload ref has an unsupported kind.');
    }

    return createFeaturePayloadRef(readString(value, 'id'));
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string {
    const value = record[key];

    if (typeof value !== 'string') {
        throw invalidDocument(`Expected "${key}" to be a string.`);
    }

    return value;
}

function readNumber(record: Readonly<Record<string, unknown>>, key: string): number {
    const value = record[key];

    if (typeof value !== 'number') {
        throw invalidDocument(`Expected "${key}" to be a number.`);
    }

    return value;
}

function readBoolean(record: Readonly<Record<string, unknown>>, key: string): boolean {
    const value = record[key];

    if (typeof value !== 'boolean') {
        throw invalidDocument(`Expected "${key}" to be a boolean.`);
    }

    return value;
}

function readArray(record: Readonly<Record<string, unknown>>, key: string): readonly unknown[] {
    const value = record[key];

    if (!Array.isArray(value)) {
        throw invalidDocument(`Expected "${key}" to be an array.`);
    }

    return value;
}

function readVector3(value: unknown, key: string): Vector3Snapshot {
    assertRecord(value, `Expected "${key}" to be a vector.`);

    return {
        x: readNumber(value, 'x'),
        y: readNumber(value, 'y'),
        z: readNumber(value, 'z'),
    };
}

function readFeatureStatus(value: unknown): FeatureStatus {
    if (value === 'ready' || value === 'suppressed') {
        return value;
    }

    throw invalidDocument('Unsupported feature status.');
}

function readFeatureType(value: unknown): FeatureTypeId {
    if (value === 'placeholder' || value === 'sketch') {
        return value;
    }

    throw invalidDocument('Unsupported feature type.');
}

function readReferencePlaneKind(value: unknown): ReferencePlaneKind {
    if (value === 'xy' || value === 'yz' || value === 'zx') {
        return value;
    }

    throw invalidDocument('Unsupported reference plane kind.');
}

function readSketchPlaneKind(value: unknown): SketchPlaneKind {
    if (value === 'xy' || value === 'yz' || value === 'zx') {
        return value;
    }

    throw invalidDocument('Unsupported sketch plane kind.');
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw invalidDocument(message);
    }
}

function invalidDocument(message: string): DocumentFileError {
    return new DocumentFileError('invalid-document', message);
}
