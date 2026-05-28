import type { ModelRef, ObjectRef } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';

export type SketchId = string;
export type SketchPointId = string;
export type SketchCurveId = string;
export type SketchVertexId = string;
export type SketchEdgeId = string;
export type SketchPlaneKind = 'xy' | 'yz' | 'zx';
export type SketchConstraintId = string;
export type SketchDimensionId = string;
export type SketchProfileId = string;
export type SketchEdgeRole = 'construction' | 'normal';
export enum SketchEntityKind {
    Constraint = 'constraint',
    Curve = 'curve',
    Dimension = 'dimension',
    Edge = 'edge',
    Point = 'point',
    Profile = 'profile',
    SketchState = 'sketch-state',
    Vertex = 'vertex',
}
export type SketchEntityStoreName =
    | 'constraints'
    | 'curves'
    | 'dimensions'
    | 'edges'
    | 'points'
    | 'profiles'
    | 'state'
    | 'vertices';

export interface SketchPlaneInput {
    readonly planeKind: SketchPlaneKind;
    readonly planeObjectRef: SketchPlaneObjectRef;
}

export type SketchPlaneObjectRef = ObjectRef<string, 'cad.object.reference-plane'>;

export type SketchEntityRef =
    | (ModelRef<SketchConstraintId, SketchEntityKind.Constraint> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchCurveId, SketchEntityKind.Curve> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchDimensionId, SketchEntityKind.Dimension> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchEdgeId, SketchEntityKind.Edge> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchPointId, SketchEntityKind.Point> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchProfileId, SketchEntityKind.Profile> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchId, SketchEntityKind.SketchState> & {
          readonly sketchId: SketchId;
      })
    | (ModelRef<SketchVertexId, SketchEntityKind.Vertex> & {
          readonly sketchId: SketchId;
      });

export interface Point2DSnapshot {
    readonly id: SketchPointId;
    readonly kind: 'point';
    readonly position: Vector2;
}

export interface Line2DSnapshot {
    readonly direction: Vector2;
    readonly id: SketchCurveId;
    readonly kind: 'line';
    readonly origin: Vector2;
}

export interface Circle2DSnapshot {
    readonly center: Vector2;
    readonly id: SketchCurveId;
    readonly kind: 'circle';
    readonly radius: number;
}

export interface Ellipse2DSnapshot {
    readonly center: Vector2;
    readonly id: SketchCurveId;
    readonly kind: 'ellipse';
    readonly majorRadius: number;
    readonly minorRadius: number;
    readonly xAxis: Vector2;
    readonly yAxis: Vector2;
}

export interface Arc2DSnapshot {
    readonly center: Vector2;
    readonly endAngleRadians: number;
    readonly id: SketchCurveId;
    readonly kind: 'arc';
    readonly radius: number;
    readonly startAngleRadians: number;
}

export type Curve2DSnapshot = Arc2DSnapshot | Circle2DSnapshot | Ellipse2DSnapshot | Line2DSnapshot;

export interface VertexSnapshot {
    readonly id: SketchVertexId;
    readonly kind: 'vertex';
    readonly pointId: SketchPointId;
}

export interface EdgeSnapshot {
    readonly curveId: SketchCurveId;
    readonly endVertexId: SketchVertexId;
    readonly id: SketchEdgeId;
    readonly kind: 'edge';
    readonly role: SketchEdgeRole;
    readonly startVertexId: SketchVertexId;
}

export interface SketchStateSnapshot {
    readonly kind: 'sketch-state';
    readonly nextConstraintIndex: number;
    readonly nextCurveIndex: number;
    readonly nextDimensionIndex: number;
    readonly nextEdgeIndex: number;
    readonly nextPointIndex: number;
    readonly nextProfileIndex: number;
    readonly nextVertexIndex: number;
    readonly revision: number;
}

export type SketchEntitySnapshot =
    | {
          readonly store: 'curves';
          readonly value: Curve2DSnapshot;
      }
    | {
          readonly store: 'edges';
          readonly value: EdgeSnapshot;
      }
    | {
          readonly store: 'points';
          readonly value: Point2DSnapshot;
      }
    | {
          readonly store: 'state';
          readonly value: SketchStateSnapshot;
      }
    | {
          readonly store: 'vertices';
          readonly value: VertexSnapshot;
      };

export type SketchPropertyValue = Vector2 | boolean | number | string | null;
