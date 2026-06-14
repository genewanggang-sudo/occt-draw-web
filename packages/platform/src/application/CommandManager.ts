import type { ViewportEvent, ViewportEventHandler, ViewportKeyboardEvent } from './ViewportEvents';

export class CommandManager<
    TCommandId extends string,
    TContext,
    TResult,
    TCommand extends ViewportEventHandler<TContext, TResult> & {
        readonly id: TCommandId;
        cancel(context: TContext): TResult;
        enter(context: TContext): TResult;
        exit(context: TContext): TResult;
    },
> implements ViewportEventHandler {
    private readonly commands: ReadonlyMap<TCommandId, TCommand>;
    private activeCommandId: TCommandId;

    constructor(input: {
        readonly activeCommandId: TCommandId;
        readonly applyResult: (result: TResult) => boolean;
        readonly commands: readonly TCommand[];
        readonly getContext: () => TContext;
        readonly getActiveCommandId?: () => TCommandId;
        readonly isCancelInput?: (event: ViewportKeyboardEvent) => boolean;
        readonly createUnhandledResult: () => TResult;
        readonly mergeResults: (first: TResult, second: TResult) => TResult;
    }) {
        this.activeCommandId = input.activeCommandId;
        this.applyResult = input.applyResult;
        this.commands = new Map(input.commands.map((command) => [command.id, command]));
        this.getActiveCommandId = input.getActiveCommandId ?? null;
        this.getContext = input.getContext;
        this.isCancelInput = input.isCancelInput ?? (() => false);
        this.createUnhandledResult = input.createUnhandledResult;
        this.mergeResults = input.mergeResults;
    }

    private readonly applyResult: (result: TResult) => boolean;
    private readonly createUnhandledResult: () => TResult;
    private readonly getActiveCommandId: (() => TCommandId) | null;
    private readonly getContext: () => TContext;
    private readonly isCancelInput: (event: ViewportKeyboardEvent) => boolean;
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

    public handleEvent(event: ViewportEvent): boolean {
        this.syncActiveCommandId();

        if (event.type === 'keyDown' && this.isCancelInput(event)) {
            return this.applyResult(this.cancel(this.getContext()));
        }

        return this.applyResult(this.forward(event));
    }

    public setActiveCommandId(commandId: TCommandId): void {
        this.activeCommandId = commandId;
    }

    private syncActiveCommandId(): void {
        this.activeCommandId = this.getActiveCommandId?.() ?? this.activeCommandId;
    }

    private forward(event: ViewportEvent): TResult {
        const command = this.getActiveCommand();

        if (!command) {
            return this.createUnhandledResult();
        }

        return command.handleEvent(event, this.getContext());
    }

    private getActiveCommand(): TCommand | null {
        return this.commands.get(this.activeCommandId) ?? null;
    }
}
