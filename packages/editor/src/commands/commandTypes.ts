import type { SelectionTarget } from '@occt-draw/core';

export type CommandId =
    | 'extrude'
    | 'select'
    | 'sketch'
    | 'sketch-circle'
    | 'sketch-line'
    | 'sketch-rectangle';
export type CommandKind = 'modal';
export type CommandStatus = 'blocked' | 'cancelled' | 'completed' | 'idle' | 'running';

export interface CommandDefinition {
    readonly id: CommandId;
    readonly kind: CommandKind;
    readonly label: string;
}

export interface SketchToolDefinition {
    readonly commandId?: CommandId;
    readonly icon: SketchToolIcon;
    readonly label: string;
    readonly shortcut?: string;
}

export interface SketchToolGroupDefinition {
    readonly icon: SketchToolIcon;
    readonly label: string;
    readonly primaryCommandId?: CommandId;
    readonly tools: readonly SketchToolDefinition[];
}

export type SketchToolIcon =
    | 'aligned-rectangle'
    | 'arc'
    | 'bezier'
    | 'center-circle'
    | 'center-rectangle'
    | 'circle-3-point'
    | 'circle-conic'
    | 'control-spline'
    | 'corner-rectangle'
    | 'ellipse'
    | 'ellipse-arc'
    | 'inscribed-polygon'
    | 'line'
    | 'midpoint-line'
    | 'point'
    | 'spline'
    | 'tangent-arc';

export interface CommandAvailability {
    readonly enabled: boolean;
    readonly reason: string | null;
}

export type CommandAvailabilityMap = Readonly<Record<CommandId, CommandAvailability>>;

export interface CommandAvailabilityContext {
    readonly activeSketchTool: 'circle' | 'line' | 'rectangle' | 'select' | null;
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
