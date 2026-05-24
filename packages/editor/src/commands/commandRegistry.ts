import type {
    CommandAvailability,
    CommandAvailabilityContext,
    CommandAvailabilityMap,
    CommandDefinition,
    CommandId,
    SketchToolGroupDefinition,
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
        id: 'sketch-rectangle',
        label: 'Rectangle',
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

export const sketchDrawingToolGroups: readonly SketchToolGroupDefinition[] = [
    {
        icon: 'line',
        label: '线',
        primaryCommandId: 'sketch-line',
        tools: [
            {
                commandId: 'sketch-line',
                icon: 'line',
                label: '线',
                shortcut: 'L',
            },
            {
                icon: 'midpoint-line',
                label: '中点线',
            },
        ],
    },
    {
        icon: 'corner-rectangle',
        label: '拐角矩形',
        primaryCommandId: 'sketch-rectangle',
        tools: [
            {
                commandId: 'sketch-rectangle',
                icon: 'corner-rectangle',
                label: '拐角矩形',
                shortcut: 'G',
            },
            {
                icon: 'center-rectangle',
                label: '中心点矩形',
                shortcut: 'R',
            },
            {
                icon: 'aligned-rectangle',
                label: '对齐矩形',
            },
        ],
    },
    {
        icon: 'center-circle',
        label: '中心点圆',
        primaryCommandId: 'sketch-circle',
        tools: [
            {
                commandId: 'sketch-circle',
                icon: 'center-circle',
                label: '中心点圆',
                shortcut: 'C',
            },
            {
                icon: 'circle-3-point',
                label: '3 点圆',
            },
            {
                icon: 'ellipse',
                label: '椭圆',
            },
        ],
    },
    {
        icon: 'arc',
        label: '3 点圆弧',
        tools: [
            {
                icon: 'arc',
                label: '3 点圆弧',
                shortcut: 'A',
            },
            {
                icon: 'tangent-arc',
                label: '相切圆弧',
            },
            {
                icon: 'center-circle',
                label: '圆心圆弧',
            },
            {
                icon: 'ellipse-arc',
                label: '椭圆弧',
            },
            {
                icon: 'circle-conic',
                label: '圆锥',
            },
        ],
    },
    {
        icon: 'inscribed-polygon',
        label: '内切多边形',
        tools: [
            {
                icon: 'inscribed-polygon',
                label: '内切多边形',
            },
            {
                icon: 'inscribed-polygon',
                label: '外接多边形',
            },
        ],
    },
    {
        icon: 'spline',
        label: '样条',
        tools: [
            {
                icon: 'spline',
                label: '样条',
            },
            {
                icon: 'bezier',
                label: 'Bezier',
            },
            {
                icon: 'control-spline',
                label: '样条控制点',
            },
        ],
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
        commandId === 'sketch-rectangle' ||
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
        'sketch-rectangle': evaluateCommandAvailability('sketch-rectangle', context),
        'sketch-circle': evaluateCommandAvailability('sketch-circle', context),
        extrude: evaluateCommandAvailability('extrude', context),
    };
}
