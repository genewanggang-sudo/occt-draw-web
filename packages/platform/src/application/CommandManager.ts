import type {
    ViewportEventHandler,
    ViewportKeyboardEvent,
    ViewportMouseEvent,
} from './ViewportEvents';

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

    public onClick(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onClick(event, context));
    }

    public onDoubleClick(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onDoubleClick(event, context));
    }

    public onKeyDown(event: ViewportKeyboardEvent): boolean {
        this.syncActiveCommandId();

        if (this.isCancelInput(event)) {
            return this.applyResult(this.cancel(this.getContext()));
        }

        return this.handle((command, context) => command.onKeyDown(event, context));
    }

    public onLeftDrag(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onLeftDrag(event, context));
    }

    public onLeftDragCancel(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onLeftDragCancel(event, context));
    }

    public onLeftDragStart(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onLeftDragStart(event, context));
    }

    public onLeftDragStop(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onLeftDragStop(event, context));
    }

    public onMiddleDrag(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onMiddleDrag(event, context));
    }

    public onMiddleDragCancel(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onMiddleDragCancel(event, context));
    }

    public onMiddleDragStart(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onMiddleDragStart(event, context));
    }

    public onMiddleDragStop(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onMiddleDragStop(event, context));
    }

    public onPointerDown(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onPointerDown(event, context));
    }

    public onPointerMove(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onPointerMove(event, context));
    }

    public onPointerUp(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onPointerUp(event, context));
    }

    public onRightDrag(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onRightDrag(event, context));
    }

    public onRightDragCancel(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onRightDragCancel(event, context));
    }

    public onRightDragStart(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onRightDragStart(event, context));
    }

    public onRightDragStop(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onRightDragStop(event, context));
    }

    public onWheel(event: ViewportMouseEvent): boolean {
        return this.handle((command, context) => command.onWheel(event, context));
    }

    public setActiveCommandId(commandId: TCommandId): void {
        this.activeCommandId = commandId;
    }

    private handle(call: (command: TCommand, context: TContext) => TResult): boolean {
        this.syncActiveCommandId();
        return this.applyResult(this.forward(call));
    }

    private syncActiveCommandId(): void {
        this.activeCommandId = this.getActiveCommandId?.() ?? this.activeCommandId;
    }

    private forward(call: (command: TCommand, context: TContext) => TResult): TResult {
        const command = this.getActiveCommand();

        if (!command) {
            return this.createUnhandledResult();
        }

        return call(command, this.getContext());
    }

    private getActiveCommand(): TCommand | null {
        return this.commands.get(this.activeCommandId) ?? null;
    }
}
