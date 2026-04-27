import { commandDefinitions } from './commandRegistry';
import type { CommandAvailabilityMap, CommandId } from './commandTypes';

interface CommandToolbarProps {
    readonly activeCommandId: CommandId;
    readonly commandAvailability: CommandAvailabilityMap;
    readonly onActivateCommand: (commandId: CommandId) => void;
}

export function CommandToolbar({
    activeCommandId,
    commandAvailability,
    onActivateCommand,
}: CommandToolbarProps) {
    return (
        <nav className="cad-workbench__command-actions" aria-label="命令入口">
            {commandDefinitions.map((command) => {
                const availability = commandAvailability[command.id];

                return (
                    <button
                        key={command.id}
                        className="cad-workbench__action cad-workbench__action--command"
                        disabled={!availability.enabled}
                        title={availability.reason ?? command.label}
                        type="button"
                        aria-pressed={activeCommandId === command.id}
                        onClick={() => {
                            onActivateCommand(command.id);
                        }}
                    >
                        {command.label}
                    </button>
                );
            })}
        </nav>
    );
}
