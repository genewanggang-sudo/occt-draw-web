import type { ReferencePlaneKind } from '@occt-draw/core';
import { createPoint3, type Plane, type Point3, type Vector2, type Vector3 } from '@occt-draw/math';

export type SketchModuleStatus = 'active';
export type SketchId = string;
export type SketchEntityId = string;
export type SketchEntityKind = 'line' | 'point';

export interface SketchModuleManifest {
    readonly domain: 'sketch';
    readonly status: SketchModuleStatus;
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

export class Sketch {
    public readonly entities: readonly SketchEntity[];
    public readonly id: SketchId;
    public readonly name: string;
    public readonly planeKind: ReferencePlaneKind;
    public readonly planeRef: string;

    constructor(input: {
        readonly entities?: readonly SketchEntity[];
        readonly id: SketchId;
        readonly name: string;
        readonly planeKind: ReferencePlaneKind;
        readonly planeRef: string;
    }) {
        this.entities = [...(input.entities ?? [])];
        this.id = input.id;
        this.name = input.name;
        this.planeKind = input.planeKind;
        this.planeRef = input.planeRef;
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

export function createSketchOnReferencePlane(input: {
    readonly id: SketchId;
    readonly name: string;
    readonly planeKind: ReferencePlaneKind;
    readonly planeRef: string;
}): Sketch {
    return new Sketch(input);
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
    return new Sketch({
        entities: [...sketch.entities, entity],
        id: sketch.id,
        name: sketch.name,
        planeKind: sketch.planeKind,
        planeRef: sketch.planeRef,
    });
}

export function removeSketchEntity(sketch: Sketch, id: SketchEntityId): Sketch {
    return new Sketch({
        entities: sketch.entities.filter((entity) => entity.id !== id),
        id: sketch.id,
        name: sketch.name,
        planeKind: sketch.planeKind,
        planeRef: sketch.planeRef,
    });
}

export function findSketchEntityById(sketch: Sketch, id: SketchEntityId): SketchEntity | null {
    return sketch.entities.find((entity) => entity.id === id) ?? null;
}

export function listSketchLines(sketch: Sketch): readonly SketchLine[] {
    return sketch.entities.filter(isSketchLine);
}

export function listSketchPoints(sketch: Sketch): readonly SketchPoint[] {
    return sketch.entities.filter(isSketchPoint);
}

export function findSketchPointById(sketch: Sketch, id: SketchEntityId): SketchPoint | null {
    const entity = findSketchEntityById(sketch, id);

    return entity?.kind === 'point' ? entity : null;
}

export function sketchPointToWorld(sketch: Sketch, point: SketchPoint): Point3 {
    if (sketch.planeKind === 'yz') {
        return createPoint3(0, point.x, point.y);
    }

    if (sketch.planeKind === 'zx') {
        return createPoint3(point.y, 0, point.x);
    }

    return createPoint3(point.x, point.y, 0);
}

export function sketchPointToWorldOnPlane(plane: Plane, point: SketchPoint): Point3 {
    return plane.localToWorld(point);
}

export function worldPointToSketchPoint2(
    planeKind: ReferencePlaneKind,
    point: Vector3,
): { readonly x: number; readonly y: number } {
    if (planeKind === 'yz') {
        return { x: point.y, y: point.z };
    }

    if (planeKind === 'zx') {
        return { x: point.z, y: point.x };
    }

    return { x: point.x, y: point.y };
}

export function worldPointToSketchPointOnPlane(plane: Plane, point: Vector3): Vector2 {
    return plane.projectPointToLocal(point);
}

function isSketchLine(entity: SketchEntity): entity is SketchLine {
    return entity.kind === 'line';
}

function isSketchPoint(entity: SketchEntity): entity is SketchPoint {
    return entity.kind === 'point';
}
