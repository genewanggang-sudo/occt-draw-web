import type { Feature, PartStudio } from '@occt-draw/core';
import { Sketch } from './model/sketch';

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

export function getSketchPayload(partStudio: PartStudio, payloadRef: string): Sketch | null {
    const payload = partStudio.findFeaturePayload(payloadRef);

    return payload instanceof Sketch ? payload : null;
}
