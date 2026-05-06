export class SelectionHighlight {
    constructor(public readonly objectIds: readonly string[]) {}
}

export class HoverHighlight {
    constructor(public readonly objectId: string | null) {}
}

export class PreselectionHighlight {
    constructor(
        public readonly objectId: string | null,
        public readonly primitiveId: string | null,
    ) {}
}
