export type CommandId = 'extrude' | 'select' | 'sketch';
export type CommandStatus = 'active' | 'idle';

export interface CommandDefinition {
    readonly enabled: boolean;
    readonly id: CommandId;
    readonly label: string;
}

export interface CommandState {
    readonly id: CommandId;
    readonly status: CommandStatus;
}
