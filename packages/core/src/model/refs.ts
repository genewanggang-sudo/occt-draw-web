export interface ModelRef<TId extends string = string, TKind extends string = string> {
    readonly id: TId;
    readonly kind: TKind;
    readonly ownerId?: string | undefined;
}

export type ObjectRef<TId extends string = string, TKind extends string = string> = ModelRef<
    TId,
    TKind
>;

export function createModelRef<TId extends string, TKind extends string>(input: {
    readonly id: TId;
    readonly kind: TKind;
    readonly ownerId?: string | undefined;
}): ModelRef<TId, TKind> {
    const ref: ModelRef<TId, TKind> = {
        id: input.id,
        kind: input.kind,
    };

    return input.ownerId === undefined ? ref : { ...ref, ownerId: input.ownerId };
}

export function createModelRefKey(ref: ModelRef): string {
    return ref.ownerId ? `${ref.ownerId}:${ref.kind}:${ref.id}` : `${ref.kind}:${ref.id}`;
}
