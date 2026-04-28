import type { FeatureId } from './ids';

export type FeatureTypeId = 'placeholder' | 'sketch';
export type FeatureStatus = 'ready' | 'suppressed';

export class Feature {
    public readonly id: FeatureId;
    public readonly name: string;
    public readonly payloadRef: string | null;
    public readonly status: FeatureStatus;
    public readonly suppressed: boolean;
    public readonly type: FeatureTypeId;

    constructor(input: {
        readonly id: FeatureId;
        readonly name: string;
        readonly payloadRef?: string | null;
        readonly status?: FeatureStatus;
        readonly suppressed?: boolean;
        readonly type: FeatureTypeId;
    }) {
        this.id = input.id;
        this.name = input.name;
        this.payloadRef = input.payloadRef ?? null;
        this.status = input.status ?? 'ready';
        this.suppressed = input.suppressed ?? false;
        this.type = input.type;
    }
}
