import type { SelectionTarget } from '@occt-draw/core';

export type CommandId = 'extrude' | 'select' | 'sketch';
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
    readonly hasSketchProfile: boolean;
    readonly selectionObjectIds: readonly string[];
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
