import type {
    CommandAvailability,
    CommandAvailabilityContext,
    CommandAvailabilityMap,
    CommandDefinition,
    CommandId,
} from './commandTypes';

export const commandDefinitions: readonly CommandDefinition[] = [
    {
        id: 'select',
        label: '选择',
        kind: 'modal',
    },
    {
        id: 'sketch',
        label: '草图',
        kind: 'modal',
    },
    {
        id: 'sketch-line',
        label: '直线',
        kind: 'modal',
    },
    {
        id: 'extrude',
        label: '拉伸',
        kind: 'modal',
    },
] as const;

export function getCommandDefinition(commandId: CommandId): CommandDefinition | undefined {
    return commandDefinitions.find((command) => command.id === commandId);
}

export function getCommandLabel(commandId: CommandId): string {
    return getCommandDefinition(commandId)?.label ?? '选择';
}

export function evaluateCommandAvailability(
    commandId: CommandId,
    context: CommandAvailabilityContext,
): CommandAvailability {
    if (commandId === 'select') {
        return {
            enabled: true,
            reason: null,
        };
    }

    if (commandId === 'sketch') {
        return {
            enabled: context.selectedReferencePlaneCount === 1,
            reason:
                context.selectedReferencePlaneCount === 1 ? null : '请选择一个基准面后再进入草图。',
        };
    }

    if (commandId === 'sketch-line') {
        return {
            enabled: context.isEditingSketch,
            reason: context.isEditingSketch ? null : '进入草图后才能使用直线。',
        };
    }

    if (!context.hasSketchProfile) {
        return {
            enabled: false,
            reason: '需要先有可拉伸的草图轮廓。',
        };
    }

    return {
        enabled: context.selectionObjectIds.length > 0,
        reason: context.selectionObjectIds.length > 0 ? null : '需要先选择一个可拉伸的草图轮廓。',
    };
}

export function evaluateCommandAvailabilityMap(
    context: CommandAvailabilityContext,
): CommandAvailabilityMap {
    return {
        select: evaluateCommandAvailability('select', context),
        sketch: evaluateCommandAvailability('sketch', context),
        'sketch-line': evaluateCommandAvailability('sketch-line', context),
        extrude: evaluateCommandAvailability('extrude', context),
    };
}
