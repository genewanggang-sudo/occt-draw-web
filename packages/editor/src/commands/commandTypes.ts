import type { SelectionTarget } from '@occt-draw/core';

export type CommandId = 'extrude' | 'select' | 'sketch' | 'sketch-line';
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
    readonly activeSketchTool: 'line' | 'select' | null;
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
