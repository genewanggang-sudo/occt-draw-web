import type { SelectionSet } from '@occt-draw/core';
import { evaluateCommandAvailability, getCommandLabel } from './commandRegistry';
import type {
    CommandAvailabilityContext,
    CommandId,
    CommandSelectionContext,
    CommandSession,
} from './commandTypes';

const SELECT_MESSAGE = '选择对象或子元素，查看属性并作为后续命令输入。';

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
            message: availability.reason ?? `${getCommandLabel(commandId)} 当前不可用。`,
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
        message: current.id === 'select' ? SELECT_MESSAGE : '命令已取消，已回到选择模式。',
        selectionContext: current.selectionContext,
    };
}

export function completeCommandSession(current: CommandSession): CommandSession {
    return {
        ...current,
        status: 'completed',
        message: `${getCommandLabel(current.id)}命令已完成。`,
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
            message: selection.isEmpty() ? SELECT_MESSAGE : '已选择对象或子元素。',
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
        return '选择基准面后进入草图。';
    }

    if (commandId === 'sketch-line') {
        return '指定直线起点。';
    }

    if (commandId === 'extrude') {
        return '拉伸命令已进入。';
    }

    return SELECT_MESSAGE;
}
