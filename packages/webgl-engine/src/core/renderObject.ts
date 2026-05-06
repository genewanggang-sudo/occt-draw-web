import type { BoundingBox3, RenderDepthRole } from '../types';
import { RenderDirtyFlags, type RenderDirtyFlagInput } from './renderDirtyFlags';

export type GeometryBounds = BoundingBox3 | null;
export type RenderObjectPickGranularity = 'object' | 'primitive';

export interface RenderObjectOptions {
    readonly depthRole?: RenderDepthRole;
    readonly id?: string;
    readonly interactionId?: string;
    readonly metadata?: ReadonlyMap<string, unknown>;
    readonly name?: string;
    readonly pickGranularity?: RenderObjectPickGranularity;
    readonly pickable?: boolean;
    readonly visible?: boolean;
}

let nextRenderObjectId = 1;

export abstract class RenderObject {
    public readonly id: string;
    public readonly interactionId: string;
    public readonly kind: string;
    public depthRole: RenderDepthRole;
    public metadata: ReadonlyMap<string, unknown>;
    public name: string;
    public pickGranularity: RenderObjectPickGranularity;
    public pickable: boolean;
    public visible: boolean;
    private currentDirtyFlags: RenderDirtyFlags;

    protected constructor(kind: string, options: RenderObjectOptions = {}) {
        this.id = options.id ?? `${kind}-${String(nextRenderObjectId++)}`;
        this.interactionId = options.interactionId ?? this.id;
        this.kind = kind;
        this.name = options.name ?? this.id;
        this.pickGranularity = options.pickGranularity ?? 'primitive';
        this.visible = options.visible ?? true;
        this.pickable = options.pickable ?? true;
        this.metadata = options.metadata ?? new Map<string, unknown>();
        this.depthRole = options.depthRole ?? 'primary';
        this.currentDirtyFlags = RenderDirtyFlags.all();
    }

    public abstract get bounds(): GeometryBounds;

    public get dirtyFlags(): RenderDirtyFlags {
        return this.currentDirtyFlags;
    }

    public clearDirty(): void {
        this.currentDirtyFlags = RenderDirtyFlags.clean();
    }

    public markDirty(flags: RenderDirtyFlags | RenderDirtyFlagInput): void {
        this.currentDirtyFlags = this.currentDirtyFlags.merge(flags);
    }
}
