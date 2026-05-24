import {
    BaseModelEntity,
    createModelRef,
    type ModelPropertyValue,
    type ObjectRef,
} from '@occt-draw/core';
import type { FeatureId, FeaturePayloadId } from './ids';

export type FeatureTypeId = 'placeholder' | 'sketch';
export type FeatureStatus = 'ready' | 'suppressed';
export type FeaturePayloadRef = ObjectRef<FeaturePayloadId, 'cad.feature-payload'>;

export function createFeaturePayloadRef(payloadId: FeaturePayloadId): FeaturePayloadRef {
    return createModelRef({
        id: payloadId,
        kind: 'cad.feature-payload',
    });
}

export class Feature extends BaseModelEntity {
    public readonly payloadRef: FeaturePayloadRef | null;
    public readonly status: FeatureStatus;
    public readonly suppressed: boolean;
    public readonly type: FeatureTypeId;

    constructor(input: {
        readonly id: FeatureId;
        readonly metadata?: ReadonlyMap<string, unknown> | null;
        readonly name: string;
        readonly payloadRef?: FeaturePayloadRef | null;
        readonly status?: FeatureStatus;
        readonly suppressed?: boolean;
        readonly type: FeatureTypeId;
    }) {
        super({
            id: input.id,
            metadata: input.metadata ?? null,
            modelType: `cad.feature.${input.type}`,
            name: input.name,
            properties: new Map<string, ModelPropertyValue>([
                ['payloadRef', input.payloadRef ?? null],
                ['status', input.status ?? 'ready'],
                ['suppressed', input.suppressed ?? false],
                ['type', input.type],
            ]),
        });
        this.payloadRef = input.payloadRef ?? null;
        this.status = input.status ?? 'ready';
        this.suppressed = input.suppressed ?? false;
        this.type = input.type;
    }
}
