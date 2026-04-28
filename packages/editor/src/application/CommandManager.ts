import type { CommandId } from '../commands/commandTypes';
import type {
    CadCommand,
    CommandContext,
    CommandKeyEvent,
    CommandPointerEvent,
    CommandResult,
} from '../commands/CadCommand';
import { createUnhandledCommandResult, mergeCommandResults } from '../commands/CadCommand';

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

    public activate(commandId: CommandId, context: CommandContext): CommandResult {
        const nextCommand = this.commands.get(commandId);

        if (!nextCommand) {
            return createUnhandledCommandResult();
        }

        const exitResult = this.getActiveCommand()?.exit(context) ?? createUnhandledCommandResult();
        this.activeCommandId = commandId;
        return mergeCommandResults(exitResult, nextCommand.enter(context));
    }

    public cancel(context: CommandContext): CommandResult {
        return this.getActiveCommand()?.cancel(context) ?? createUnhandledCommandResult();
    }

    public pointerDown(event: CommandPointerEvent, context: CommandContext): CommandResult {
        return (
            this.getActiveCommand()?.pointerDown(event, context) ?? createUnhandledCommandResult()
        );
    }

    public pointerCancel(event: CommandPointerEvent, context: CommandContext): CommandResult {
        return (
            this.getActiveCommand()?.pointerCancel(event, context) ?? createUnhandledCommandResult()
        );
    }

    public pointerMove(event: CommandPointerEvent, context: CommandContext): CommandResult {
        return (
            this.getActiveCommand()?.pointerMove(event, context) ?? createUnhandledCommandResult()
        );
    }

    public pointerUp(event: CommandPointerEvent, context: CommandContext): CommandResult {
        return this.getActiveCommand()?.pointerUp(event, context) ?? createUnhandledCommandResult();
    }

    public keyDown(event: CommandKeyEvent, context: CommandContext): CommandResult {
        return this.getActiveCommand()?.keyDown(event, context) ?? createUnhandledCommandResult();
    }

    public setActiveCommandId(commandId: CommandId): void {
        this.activeCommandId = commandId;
    }

    private getActiveCommand(): CadCommand | null {
        return this.commands.get(this.activeCommandId) ?? null;
    }
}
