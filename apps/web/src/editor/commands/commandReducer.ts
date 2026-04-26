import { getCommandDefinition } from './commandRegistry';
import type { CommandId, CommandState } from './commandTypes';

export function createInitialCommandState(): CommandState {
    return {
        id: 'select',
        status: 'active',
    };
}

export function activateCommand(current: CommandState, commandId: CommandId): CommandState {
    const definition = getCommandDefinition(commandId);

    if (!definition?.enabled) {
        return current;
    }

    return {
        id: commandId,
        status: 'active',
    };
}
