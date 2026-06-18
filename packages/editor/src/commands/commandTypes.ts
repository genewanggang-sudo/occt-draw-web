import type { SelectionTarget } from '@occt-draw/core';

export type CommandId =
    | 'extrude'
    | 'select'
    | 'sketch-aligned-rectangle'
    | 'sketch-center-arc'
    | 'sketch-center-rectangle'
    | 'sketch'
    | 'sketch-circle'
    | 'sketch-conic'
    | 'sketch-circumscribed-polygon'
    | 'sketch-ellipse'
    | 'sketch-elliptical-arc'
    | 'sketch-line'
    | 'sketch-inscribed-polygon'
    | 'sketch-midpoint-line'
    | 'sketch-point'
    | 'sketch-spline'
    | 'sketch-tangent-arc'
    | 'sketch-3-point-arc'
    | 'sketch-3-point-circle'
    | 'sketch-rectangle';
export type CommandKind = 'modal';
export type CommandStatus = 'blocked' | 'cancelled' | 'completed' | 'idle' | 'running';

export interface CommandDefinition {
    readonly id: CommandId;
    readonly kind: CommandKind;
    readonly label: string;
}

export interface CommandAvailability {
    readonly enabled: boolean;
    readonly reason: string | null;
}

export type CommandAvailabilityMap = Readonly<Record<CommandId, CommandAvailability>>;

export interface CommandAvailabilityContext {
    readonly activeSketchTool:
        | 'aligned-rectangle'
        | 'center-arc'
        | 'center-rectangle'
        | 'circle'
        | 'conic'
        | 'circumscribed-polygon'
        | 'ellipse'
        | 'elliptical-arc'
        | 'line'
        | 'inscribed-polygon'
        | 'midpoint-line'
        | 'point'
        | 'rectangle'
        | 'select'
        | 'spline'
        | 'tangent-arc'
        | 'three-point-arc'
        | 'three-point-circle'
        | null;
    readonly hasSketchProfile: boolean;
    readonly isEditingSketch: boolean;
    readonly selectionObjectIds: readonly string[];
    readonly selectedReferencePlaneCount: number;
}

export interface CommandSelectionContext {
    readonly selectedObjectIds: readonly string[];
    readonly primaryTarget: SelectionTarget | null;
}

export interface CommandSession {
    readonly id: CommandId;
    readonly message: string;
    readonly selectionContext: CommandSelectionContext | null;
    readonly status: CommandStatus;
}
