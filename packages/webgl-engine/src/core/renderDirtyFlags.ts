export interface RenderDirtyFlagInput {
    readonly bounds?: boolean;
    readonly geometry?: boolean;
    readonly object?: boolean;
    readonly pick?: boolean;
    readonly style?: boolean;
}

export class RenderDirtyFlags {
    public static clean(): RenderDirtyFlags {
        return new RenderDirtyFlags({});
    }

    public static all(): RenderDirtyFlags {
        return new RenderDirtyFlags({
            bounds: true,
            geometry: true,
            object: true,
            pick: true,
            style: true,
        });
    }

    public readonly bounds: boolean;
    public readonly geometry: boolean;
    public readonly object: boolean;
    public readonly pick: boolean;
    public readonly style: boolean;

    constructor(flags: RenderDirtyFlagInput) {
        this.bounds = flags.bounds ?? false;
        this.geometry = flags.geometry ?? false;
        this.object = flags.object ?? false;
        this.pick = flags.pick ?? false;
        this.style = flags.style ?? false;
    }

    public get isClean(): boolean {
        return !this.bounds && !this.geometry && !this.object && !this.pick && !this.style;
    }

    public merge(flags: RenderDirtyFlags | RenderDirtyFlagInput): RenderDirtyFlags {
        return new RenderDirtyFlags({
            bounds: this.bounds || (flags.bounds ?? false),
            geometry: this.geometry || (flags.geometry ?? false),
            object: this.object || (flags.object ?? false),
            pick: this.pick || (flags.pick ?? false),
            style: this.style || (flags.style ?? false),
        });
    }
}
