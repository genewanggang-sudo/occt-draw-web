import type { FeatureId } from './ids';

export type FeatureKind = 'placeholder';
export type FeatureStatus = 'ready' | 'suppressed';

export interface Feature {
    readonly id: FeatureId;
    readonly kind: FeatureKind;
    readonly name: string;
    readonly status: FeatureStatus;
    readonly suppressed: boolean;
}
