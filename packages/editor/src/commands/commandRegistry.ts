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
        label: 'Select',
        kind: 'modal',
    },
    {
        id: 'sketch',
        label: 'Sketch',
        kind: 'modal',
    },
    {
        id: 'sketch-line',
        label: 'Line',
        kind: 'modal',
    },
    {
        id: 'sketch-midpoint-line',
        label: 'Midpoint line',
        kind: 'modal',
    },
    {
        id: 'sketch-rectangle',
        label: 'Rectangle',
        kind: 'modal',
    },
    {
        id: 'sketch-center-rectangle',
        label: 'Center point rectangle',
        kind: 'modal',
    },
    {
        id: 'sketch-aligned-rectangle',
        label: 'Aligned rectangle',
        kind: 'modal',
    },
    {
        id: 'sketch-circle',
        label: 'Circle',
        kind: 'modal',
    },
    {
        id: 'extrude',
        label: 'Extrude',
        kind: 'modal',
    },
] as const;

export function getCommandDefinition(commandId: CommandId): CommandDefinition | undefined {
    return commandDefinitions.find((command) => command.id === commandId);
}

export function getCommandLabel(commandId: CommandId): string {
    return getCommandDefinition(commandId)?.label ?? 'Select';
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
                context.selectedReferencePlaneCount === 1
                    ? null
                    : 'Select one reference plane before entering sketch.',
        };
    }

    if (
        commandId === 'sketch-line' ||
        commandId === 'sketch-midpoint-line' ||
        commandId === 'sketch-rectangle' ||
        commandId === 'sketch-center-rectangle' ||
        commandId === 'sketch-aligned-rectangle' ||
        commandId === 'sketch-circle'
    ) {
        return {
            enabled: context.isEditingSketch,
            reason: context.isEditingSketch ? null : 'Enter sketch before using sketch tools.',
        };
    }

    if (!context.hasSketchProfile) {
        return {
            enabled: false,
            reason: 'Create a sketch profile before extrusion.',
        };
    }

    return {
        enabled: context.selectionObjectIds.length > 0,
        reason: context.selectionObjectIds.length > 0 ? null : 'Select a sketch profile first.',
    };
}

export function evaluateCommandAvailabilityMap(
    context: CommandAvailabilityContext,
): CommandAvailabilityMap {
    return {
        select: evaluateCommandAvailability('select', context),
        sketch: evaluateCommandAvailability('sketch', context),
        'sketch-line': evaluateCommandAvailability('sketch-line', context),
        'sketch-midpoint-line': evaluateCommandAvailability('sketch-midpoint-line', context),
        'sketch-rectangle': evaluateCommandAvailability('sketch-rectangle', context),
        'sketch-center-rectangle': evaluateCommandAvailability('sketch-center-rectangle', context),
        'sketch-aligned-rectangle': evaluateCommandAvailability(
            'sketch-aligned-rectangle',
            context,
        ),
        'sketch-circle': evaluateCommandAvailability('sketch-circle', context),
        extrude: evaluateCommandAvailability('extrude', context),
    };
}
