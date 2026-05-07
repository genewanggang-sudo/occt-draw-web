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
    private currentDirtyFlags: RenderDirtyFlags;
    private currentDepthRole: RenderDepthRole;
    private currentMetadata: ReadonlyMap<string, unknown>;
    private currentName: string;
    private currentPickable: boolean;
    private currentPickGranularity: RenderObjectPickGranularity;
    private currentVisible: boolean;

    protected constructor(kind: string, options: RenderObjectOptions = {}) {
        this.id = options.id ?? `${kind}-${String(nextRenderObjectId++)}`;
        this.interactionId = options.interactionId ?? this.id;
        this.kind = kind;
        this.currentName = options.name ?? this.id;
        this.currentPickGranularity = options.pickGranularity ?? 'primitive';
        this.currentVisible = options.visible ?? true;
        this.currentPickable = options.pickable ?? true;
        this.currentMetadata = options.metadata ?? new Map<string, unknown>();
        this.currentDepthRole = options.depthRole ?? 'primary';
        this.currentDirtyFlags = RenderDirtyFlags.all();
    }

    public abstract get bounds(): GeometryBounds;

    public get depthRole(): RenderDepthRole {
        return this.currentDepthRole;
    }

    public get dirtyFlags(): RenderDirtyFlags {
        return this.currentDirtyFlags;
    }

    public get metadata(): ReadonlyMap<string, unknown> {
        return this.currentMetadata;
    }

    public get name(): string {
        return this.currentName;
    }

    public get pickable(): boolean {
        return this.currentPickable;
    }

    public get pickGranularity(): RenderObjectPickGranularity {
        return this.currentPickGranularity;
    }

    public get visible(): boolean {
        return this.currentVisible;
    }

    public clearDirty(): void {
        this.currentDirtyFlags = RenderDirtyFlags.clean();
    }

    public markDirty(flags: RenderDirtyFlags | RenderDirtyFlagInput): void {
        this.currentDirtyFlags = this.currentDirtyFlags.merge(flags);
    }

    public setDepthRole(depthRole: RenderDepthRole): void {
        if (this.currentDepthRole === depthRole) {
            return;
        }

        this.currentDepthRole = depthRole;
        this.markDirty({ object: true });
    }

    public setMetadata(metadata: ReadonlyMap<string, unknown>): void {
        if (this.currentMetadata === metadata) {
            return;
        }

        this.currentMetadata = metadata;
        this.markDirty({ object: true });
    }

    public setPickable(pickable: boolean): void {
        if (this.currentPickable === pickable) {
            return;
        }

        this.currentPickable = pickable;
        this.markDirty({ object: true });
    }

    public setVisible(visible: boolean): void {
        if (this.currentVisible === visible) {
            return;
        }

        this.currentVisible = visible;
        this.markDirty({ object: true });
    }
}
