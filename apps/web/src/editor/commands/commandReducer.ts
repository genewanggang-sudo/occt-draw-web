import type { SelectionSet } from '@occt-draw/core';
import { getCommandDefinition } from './commandRegistry';
import type { CommandId, CommandSession } from './commandTypes';

export function createInitialCommandSession(): CommandSession {
    return {
        id: 'select',
        status: 'armed',
        context: null,
    };
}

export function activateCommandSession(
    current: CommandSession,
    commandId: CommandId,
): CommandSession {
    const definition = getCommandDefinition(commandId);

    if (!definition?.enabled) {
        return current;
    }

    return {
        id: commandId,
        status: 'armed',
        context: null,
    };
}

export function cancelCommandSession(current: CommandSession): CommandSession {
    if (current.id === 'select') {
        return {
            id: 'select',
            status: 'armed',
            context: null,
        };
    }

    return {
        id: 'select',
        status: 'armed',
        context: null,
    };
}

export function completeCommandSession(current: CommandSession): CommandSession {
    return {
        ...current,
        status: 'completed',
    };
}

export function resetToSelectCommandSession(): CommandSession {
    return {
        id: 'select',
        status: 'armed',
        context: null,
    };
}

export function consumeSelectionForCommandSession(
    current: CommandSession,
    selection: SelectionSet,
): CommandSession {
    if (current.id === 'select') {
        return current;
    }

    if (selection.isEmpty()) {
        return current;
    }

    return {
        ...current,
        status: 'running',
        context: {
            selectionObjectIds: selection.objectIds,
        },
    };
}
