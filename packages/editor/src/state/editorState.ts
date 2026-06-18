import type { CadDocument } from '@occt-draw/cad-model';
import type { DocumentSession, EditDraft } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';
import type { SelectionState, ViewNavigationState } from '@occt-draw/platform';
import type { SketchVertexId } from '@occt-draw/sketch';
import type { CommandSession } from '../commands/commandTypes';

export type SketchLineStart =
    | {
          readonly kind: 'point';
          readonly point: Vector2;
      }
    | {
          readonly kind: 'vertex';
          readonly vertexId: SketchVertexId;
      };

export interface SketchAlignedRectangleEdge {
    readonly end: Vector2;
    readonly start: Vector2;
}

export type SketchToolState =
    | { readonly kind: 'aligned-rectangle'; readonly firstEdge: SketchAlignedRectangleEdge | null }
    | {
          readonly centerPoint: Vector2 | null;
          readonly kind: 'center-arc';
          readonly startPoint: Vector2 | null;
      }
    | { readonly center: Vector2 | null; readonly kind: 'circle' }
    | { readonly center: Vector2 | null; readonly kind: 'center-rectangle' }
    | {
          readonly center: Vector2 | null;
          readonly kind: 'circumscribed-polygon';
          readonly sideCount: number;
      }
    | {
          readonly centerPoint: Vector2 | null;
          readonly kind: 'ellipse';
          readonly primaryAxisPoint: Vector2 | null;
      }
    | {
          readonly centerPoint: Vector2 | null;
          readonly endAngleRadians: number | null;
          readonly kind: 'elliptical-arc';
          readonly primaryAxisPoint: Vector2 | null;
          readonly secondaryPoint: Vector2 | null;
          readonly startAngleRadians: number | null;
          readonly startPoint: Vector2 | null;
      }
    | { readonly firstCorner: Vector2 | null; readonly kind: 'rectangle' }
    | {
          readonly center: Vector2 | null;
          readonly kind: 'inscribed-polygon';
          readonly sideCount: number;
      }
    | { readonly kind: 'line'; readonly start: SketchLineStart | null }
    | { readonly kind: 'midpoint-line'; readonly midpoint: Vector2 | null }
    | { readonly kind: 'point' }
    | { readonly kind: 'select' }
    | { readonly fitPoints: readonly Vector2[]; readonly kind: 'spline' }
    | {
          readonly endPoint: Vector2 | null;
          readonly kind: 'conic';
          readonly startPoint: Vector2 | null;
      }
    | {
          readonly kind: 'tangent-arc';
          readonly startPoint: Vector2 | null;
          readonly startTangent: Vector2 | null;
          readonly startVertexId: SketchVertexId | null;
      }
    | {
          readonly endPoint: Vector2 | null;
          readonly kind: 'three-point-arc';
          readonly startPoint: Vector2 | null;
      }
    | {
          readonly firstPoint: Vector2 | null;
          readonly kind: 'three-point-circle';
          readonly secondPoint: Vector2 | null;
      };

export type SketchToolKind = SketchToolState['kind'];

export interface SketchDisplayOptions {
    readonly showConstraints: boolean;
    readonly showErrors: boolean;
    readonly showExpressions: boolean;
}

export interface SketchEditSession {
    readonly displayOptions: SketchDisplayOptions;
    readonly sketchFeatureId: string;
    readonly tool: SketchToolState;
}

export interface EditorState {
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly document: CadDocument;
    readonly documentSession: DocumentSession<CadDocument>;
    readonly draft: EditDraft<CadDocument> | null;
    readonly navigation: ViewNavigationState;
    readonly selection: SelectionState;
}

export function createDefaultSketchDisplayOptions(): SketchDisplayOptions {
    return {
        showConstraints: false,
        showErrors: true,
        showExpressions: false,
    };
}
