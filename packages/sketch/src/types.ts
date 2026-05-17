import type { ReferencePlaneKind } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';

export type SketchId = string;
export type SketchPointId = string;
export type SketchCurveId = string;
export type SketchVertexId = string;
export type SketchEdgeId = string;
export type SketchConstraintId = string;
export type SketchDimensionId = string;
export type SketchProfileId = string;
export type SketchEdgeRole = 'construction' | 'normal';
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
    readonly planeKind: ReferencePlaneKind;
    readonly planeRef: string;
}

export type SketchEntityRef =
    | {
          readonly kind: 'constraint';
          readonly constraintId: SketchConstraintId;
          readonly sketchId: SketchId;
      }
    | {
          readonly curveId: SketchCurveId;
          readonly kind: 'curve';
          readonly sketchId: SketchId;
      }
    | {
          readonly dimensionId: SketchDimensionId;
          readonly kind: 'dimension';
          readonly sketchId: SketchId;
      }
    | {
          readonly edgeId: SketchEdgeId;
          readonly kind: 'edge';
          readonly sketchId: SketchId;
      }
    | {
          readonly kind: 'point';
          readonly pointId: SketchPointId;
          readonly sketchId: SketchId;
      }
    | {
          readonly kind: 'profile';
          readonly profileId: SketchProfileId;
          readonly sketchId: SketchId;
      }
    | {
          readonly kind: 'sketch-state';
          readonly sketchId: SketchId;
      }
    | {
          readonly kind: 'vertex';
          readonly sketchId: SketchId;
          readonly vertexId: SketchVertexId;
      };

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

export interface Arc2DSnapshot {
    readonly center: Vector2;
    readonly endAngleRadians: number;
    readonly id: SketchCurveId;
    readonly kind: 'arc';
    readonly radius: number;
    readonly startAngleRadians: number;
}

export type Curve2DSnapshot = Arc2DSnapshot | Circle2DSnapshot | Line2DSnapshot;

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
