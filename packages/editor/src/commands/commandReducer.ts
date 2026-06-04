import type { SelectionSet } from '@occt-draw/core';
import { evaluateCommandAvailability, getCommandLabel } from './commandRegistry';
import type {
    CommandAvailabilityContext,
    CommandId,
    CommandSelectionContext,
    CommandSession,
} from './commandTypes';

const SELECT_MESSAGE = 'Select an object or sub-element.';

export function createInitialCommandSession(): CommandSession {
    return {
        id: 'select',
        status: 'idle',
        message: SELECT_MESSAGE,
        selectionContext: null,
    };
}

export function activateCommandSession(
    current: CommandSession,
    commandId: CommandId,
    availabilityContext: CommandAvailabilityContext,
): CommandSession {
    const availability = evaluateCommandAvailability(commandId, availabilityContext);

    if (!availability.enabled) {
        return {
            ...current,
            status: 'blocked',
            message: availability.reason ?? `${getCommandLabel(commandId)} is unavailable.`,
        };
    }

    return {
        id: commandId,
        status: commandId === 'select' ? 'idle' : 'running',
        message: getCommandRunningMessage(commandId),
        selectionContext: current.selectionContext,
    };
}

export function cancelCommandSession(current: CommandSession): CommandSession {
    return {
        id: 'select',
        status: current.id === 'select' ? 'idle' : 'cancelled',
        message: current.id === 'select' ? SELECT_MESSAGE : 'Command cancelled.',
        selectionContext: current.selectionContext,
    };
}

export function completeCommandSession(current: CommandSession): CommandSession {
    return {
        ...current,
        status: 'completed',
        message: `${getCommandLabel(current.id)} command completed.`,
    };
}

export function resetToSelectCommandSession(): CommandSession {
    return {
        id: 'select',
        status: 'idle',
        message: SELECT_MESSAGE,
        selectionContext: null,
    };
}

export function updateCommandSessionMessage(
    current: CommandSession,
    message: string,
): CommandSession {
    return {
        ...current,
        message,
    };
}

export function consumeSelectionForCommandSession(
    current: CommandSession,
    selection: SelectionSet,
): CommandSession {
    const selectionContext = createCommandSelectionContext(selection);

    if (current.id === 'select') {
        return {
            ...current,
            status: 'idle',
            message: selection.isEmpty() ? SELECT_MESSAGE : 'Selection updated.',
            selectionContext,
        };
    }

    return {
        ...current,
        status: 'running',
        message: getCommandRunningMessage(current.id),
        selectionContext,
    };
}

function createCommandSelectionContext(selection: SelectionSet): CommandSelectionContext | null {
    if (selection.isEmpty()) {
        return null;
    }

    return {
        selectedObjectIds: selection.objectIds,
        primaryTarget: selection.primaryTarget,
    };
}

function getCommandRunningMessage(commandId: CommandId): string {
    if (commandId === 'sketch') {
        return 'Select a reference plane to enter sketch.';
    }

    if (commandId === 'sketch-line') {
        return 'Specify line start point.';
    }

    if (commandId === 'sketch-midpoint-line') {
        return 'Specify midpoint line center point.';
    }

    if (commandId === 'sketch-rectangle') {
        return 'Specify rectangle first corner.';
    }

    if (commandId === 'sketch-center-rectangle') {
        return 'Specify rectangle center point.';
    }

    if (commandId === 'sketch-aligned-rectangle') {
        return 'Specify aligned rectangle first corner.';
    }

    if (commandId === 'sketch-circle') {
        return 'Specify circle center.';
    }

    if (commandId === 'sketch-3-point-arc') {
        return 'Specify arc start point.';
    }

    if (commandId === 'sketch-center-arc') {
        return 'Specify arc center point.';
    }

    if (commandId === 'sketch-3-point-circle') {
        return 'Specify first point on circle.';
    }

    if (commandId === 'sketch-ellipse') {
        return 'Specify ellipse center.';
    }

    if (commandId === 'extrude') {
        return 'Extrude command is active.';
    }

    return SELECT_MESSAGE;
}
