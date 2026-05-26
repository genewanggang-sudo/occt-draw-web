import type { PlatformCommandResult } from '../commands/PlatformCommand';
import type { ViewportInputEvent } from './ViewportInput';

export class CommandManager<
    TCommandId extends string,
    TContext,
    TResult extends PlatformCommandResult,
    TCommand extends {
        readonly id: TCommandId;
        cancel(context: TContext): TResult;
        enter(context: TContext): TResult;
        exit(context: TContext): TResult;
        handleInput(event: ViewportInputEvent, context: TContext): TResult;
    },
> {
    private readonly commands: ReadonlyMap<TCommandId, TCommand>;
    private activeCommandId: TCommandId;

    constructor(input: {
        readonly activeCommandId: TCommandId;
        readonly commands: readonly TCommand[];
        readonly createUnhandledResult: () => TResult;
        readonly mergeResults: (first: TResult, second: TResult) => TResult;
    }) {
        this.activeCommandId = input.activeCommandId;
        this.commands = new Map(input.commands.map((command) => [command.id, command]));
        this.createUnhandledResult = input.createUnhandledResult;
        this.mergeResults = input.mergeResults;
    }

    private readonly createUnhandledResult: () => TResult;
    private readonly mergeResults: (first: TResult, second: TResult) => TResult;

    public activate(commandId: TCommandId, context: TContext): TResult {
        const nextCommand = this.commands.get(commandId);

        if (!nextCommand) {
            return this.createUnhandledResult();
        }

        const exitResult = this.getActiveCommand()?.exit(context) ?? this.createUnhandledResult();
        this.activeCommandId = commandId;
        return this.mergeResults(exitResult, nextCommand.enter(context));
    }

    public cancel(context: TContext): TResult {
        return this.getActiveCommand()?.cancel(context) ?? this.createUnhandledResult();
    }

    public handleInput(event: ViewportInputEvent, context: TContext): TResult {
        return this.getActiveCommand()?.handleInput(event, context) ?? this.createUnhandledResult();
    }

    public setActiveCommandId(commandId: TCommandId): void {
        this.activeCommandId = commandId;
    }

    private getActiveCommand(): TCommand | null {
        return this.commands.get(this.activeCommandId) ?? null;
    }
}
