export interface PlatformCommandPointerEvent<TPoint> {
    readonly altKey: boolean;
    readonly button: number;
    readonly buttons: number;
    readonly clickCount?: number;
    readonly ctrlKey: boolean;
    readonly point: TPoint;
    readonly pointerId: number;
    readonly shiftKey: boolean;
}

export interface PlatformCommandKeyEvent {
    readonly key: string;
}

export interface PlatformCommandResult {
    readonly handled: boolean;
}

export abstract class PlatformCommand {
    public abstract readonly id: string;
}

export function createUnhandledPlatformCommandResult(): PlatformCommandResult {
    return { handled: false };
}

export function createHandledPlatformCommandResult(
    result: Omit<PlatformCommandResult, 'handled'> = {},
): PlatformCommandResult {
    return {
        ...result,
        handled: true,
    };
}
