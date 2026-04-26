import type { CommandDefinition } from './commandTypes';

export const commandDefinitions: readonly CommandDefinition[] = [
    {
        id: 'select',
        label: '选择',
        enabled: true,
    },
    {
        id: 'sketch',
        label: '草图',
        enabled: true,
    },
    {
        id: 'extrude',
        label: '拉伸',
        enabled: false,
    },
];

export function getCommandDefinition(commandId: string): CommandDefinition | undefined {
    return commandDefinitions.find((command) => command.id === commandId);
}
