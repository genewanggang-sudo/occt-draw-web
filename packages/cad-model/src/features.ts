import { BaseModelEntity, type FeatureId } from '@occt-draw/core';

export type FeatureTypeId = 'placeholder' | 'sketch';
export type FeatureStatus = 'ready' | 'suppressed';

export class Feature extends BaseModelEntity {
    public readonly payloadRef: string | null;
    public readonly status: FeatureStatus;
    public readonly suppressed: boolean;
    public readonly type: FeatureTypeId;

    constructor(input: {
        readonly id: FeatureId;
        readonly metadata?: ReadonlyMap<string, unknown> | null;
        readonly name: string;
        readonly payloadRef?: string | null;
        readonly status?: FeatureStatus;
        readonly suppressed?: boolean;
        readonly type: FeatureTypeId;
    }) {
        super({
            id: input.id,
            metadata: input.metadata ?? null,
            name: input.name,
        });
        this.payloadRef = input.payloadRef ?? null;
        this.status = input.status ?? 'ready';
        this.suppressed = input.suppressed ?? false;
        this.type = input.type;
    }
}
