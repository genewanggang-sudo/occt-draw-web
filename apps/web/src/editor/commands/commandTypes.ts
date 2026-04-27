export type CommandId = 'extrude' | 'select' | 'sketch';
export type CommandKind = 'modal';
export type CommandStatus = 'armed' | 'cancelled' | 'completed' | 'idle' | 'running';

export interface CommandDefinition {
    readonly enabled: boolean;
    readonly id: CommandId;
    readonly kind: CommandKind;
    readonly label: string;
}

export interface CommandContext {
    readonly selectionObjectIds?: readonly string[];
}

export interface CommandSession {
    readonly context: CommandContext | null;
    readonly id: CommandId;
    readonly status: CommandStatus;
}
