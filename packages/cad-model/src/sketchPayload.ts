import { Sketch } from '@occt-draw/sketch';
import type { PartStudio } from './document';
import type { Feature, FeaturePayloadRef } from './features';

export function findSketchByFeatureId(partStudio: PartStudio, featureId: string): Sketch | null {
    const feature = partStudio.findFeatureById(featureId);

    return feature ? getSketchForFeature(partStudio, feature) : null;
}

export function getSketchForFeature(partStudio: PartStudio, feature: Feature): Sketch | null {
    if (feature.type !== 'sketch' || !feature.payloadRef) {
        return null;
    }

    return getSketchPayload(partStudio, feature.payloadRef);
}

export function getSketchPayload(
    partStudio: PartStudio,
    payloadRef: FeaturePayloadRef,
): Sketch | null {
    const payload = partStudio.findFeaturePayload(payloadRef.id);

    return payload instanceof Sketch ? payload : null;
}
