import { commandDefinitions } from './commandRegistry';
import type { CommandId } from './commandTypes';

interface CommandToolbarProps {
    readonly activeCommandId: CommandId;
    readonly onActivateCommand: (commandId: CommandId) => void;
}

export function CommandToolbar({ activeCommandId, onActivateCommand }: CommandToolbarProps) {
    return (
        <nav className="cad-workbench__command-actions" aria-label="命令入口">
            {commandDefinitions.map((command) => (
                <button
                    key={command.id}
                    className="cad-workbench__action cad-workbench__action--command"
                    disabled={!command.enabled}
                    type="button"
                    aria-pressed={activeCommandId === command.id}
                    onClick={() => {
                        onActivateCommand(command.id);
                    }}
                >
                    {command.label}
                </button>
            ))}
        </nav>
    );
}
