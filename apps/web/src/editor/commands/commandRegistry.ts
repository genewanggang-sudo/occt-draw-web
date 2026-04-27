import type { CommandDefinition, CommandId } from './commandTypes';

export const commandDefinitions: readonly CommandDefinition[] = [
    {
        id: 'select',
        label: '选择',
        kind: 'modal',
        enabled: true,
    },
    {
        id: 'sketch',
        label: '草图',
        kind: 'modal',
        enabled: true,
    },
    {
        id: 'extrude',
        label: '拉伸',
        kind: 'modal',
        enabled: false,
    },
] as const;

export function getCommandDefinition(commandId: CommandId): CommandDefinition | undefined {
    return commandDefinitions.find((command) => command.id === commandId);
}

export function getCommandLabel(commandId: CommandId): string {
    return getCommandDefinition(commandId)?.label ?? '选择';
}
