import type { CommandId } from '../commands/commandTypes';
import type {
    CadCommand,
    CommandContext,
    CommandKeyEvent,
    CommandPointerEvent,
} from '../commands/CadCommand';

export class CommandManager {
    private readonly commands: ReadonlyMap<CommandId, CadCommand>;
    private activeCommandId: CommandId;

    constructor(input: {
        readonly activeCommandId: CommandId;
        readonly commands: readonly CadCommand[];
    }) {
        this.activeCommandId = input.activeCommandId;
        this.commands = new Map(input.commands.map((command) => [command.id, command]));
    }

    activate(commandId: CommandId, context: CommandContext): void {
        const nextCommand = this.commands.get(commandId);

        if (!nextCommand) {
            return;
        }

        this.getActiveCommand()?.exit(context);
        this.activeCommandId = commandId;
        nextCommand.enter(context);
    }

    cancel(context: CommandContext): void {
        this.getActiveCommand()?.cancel(context);
    }

    pointerDown(event: CommandPointerEvent, context: CommandContext): boolean {
        return this.getActiveCommand()?.pointerDown(event, context) ?? false;
    }

    pointerMove(event: CommandPointerEvent, context: CommandContext): boolean {
        return this.getActiveCommand()?.pointerMove(event, context) ?? false;
    }

    pointerUp(event: CommandPointerEvent, context: CommandContext): boolean {
        return this.getActiveCommand()?.pointerUp(event, context) ?? false;
    }

    keyDown(event: CommandKeyEvent, context: CommandContext): boolean {
        return this.getActiveCommand()?.keyDown(event, context) ?? false;
    }

    setActiveCommandId(commandId: CommandId): void {
        this.activeCommandId = commandId;
    }

    private getActiveCommand(): CadCommand | null {
        return this.commands.get(this.activeCommandId) ?? null;
    }
}
