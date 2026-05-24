import { BaseModelElement } from '@occt-draw/core';
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

export class Vertex extends BaseModelElement {
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly id: SketchVertexId;
        readonly pointId: SketchPointId;
        readonly sketchId: SketchId;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.vertex',
            name: input.id,
            properties: new Map([['pointId', input.pointId]]),
        });
        this.sketchId = input.sketchId;
    }

    public get pointId(): SketchPointId {
        return this.getStringProperty('pointId');
    }

    public get ref(): SketchEntityRef {
        return {
            id: this.id,
            kind: SketchEntityKind.Vertex,
            ownerId: this.sketchId,
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

export class Edge extends BaseModelElement {
    private readonly sketchId: SketchId;

    constructor(input: {
        readonly curveId: SketchCurveId;
        readonly endVertexId: SketchVertexId;
        readonly id: SketchEdgeId;
        readonly role?: SketchEdgeRole;
        readonly sketchId: SketchId;
        readonly startVertexId: SketchVertexId;
    }) {
        super({
            id: input.id,
            modelType: 'sketch.edge',
            name: input.id,
            properties: new Map([
                ['curveId', input.curveId],
                ['endVertexId', input.endVertexId],
                ['role', input.role ?? 'normal'],
                ['startVertexId', input.startVertexId],
            ]),
        });
        this.sketchId = input.sketchId;
    }

    public get curveId(): SketchCurveId {
        return this.getStringProperty('curveId');
    }

    public get endVertexId(): SketchVertexId {
        return this.getStringProperty('endVertexId');
    }

    public get role(): SketchEdgeRole {
        const value = this.getStringProperty('role');

        return value === 'construction' ? 'construction' : 'normal';
    }

    public get startVertexId(): SketchVertexId {
        return this.getStringProperty('startVertexId');
    }

    public get ref(): SketchEntityRef {
        return {
            id: this.id,
            kind: SketchEntityKind.Edge,
            ownerId: this.sketchId,
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
