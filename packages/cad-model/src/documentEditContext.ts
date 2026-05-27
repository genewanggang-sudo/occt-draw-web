import type { DocumentEditLabels } from '@occt-draw/core';
import type { CadDocument, PartStudio } from './document';
import type { SketchReadTarget, SketchTargetInput } from './documentWriteContext';
import type { Feature } from './features';
import type { FeaturePayloadId } from './ids';
import { ReferencePlaneObject, referencePlaneToPlane } from './objects';
import { Sketch } from '@occt-draw/sketch';

export interface CadDocumentEditContextInput extends DocumentEditLabels {
    readonly id: string;
    readonly label: string;
}

export type SketchEditTarget = SketchReadTarget;

export class CadDocumentEditContext {
    private readonly document: CadDocument;

    private constructor(document: CadDocument, _input: CadDocumentEditContextInput) {
        this.document = document;
    }

    public static begin(
        document: CadDocument,
        input: CadDocumentEditContextInput,
    ): CadDocumentEditContext {
        return new CadDocumentEditContext(document, input);
    }

    public requireSketchTarget(input: SketchTargetInput): SketchEditTarget {
        const partStudio = this.requirePartStudio(input.partStudioId);
        const feature = this.requireSketchFeature(partStudio, input.sketchFeatureId);
        const payloadId = feature.payloadRef?.id;

        if (!payloadId) {
            throw new Error(
                `Document edit failed: Feature ${input.sketchFeatureId} is not a sketch.`,
            );
        }

        const sketch = this.requireSketchPayload(partStudio, payloadId).clone();
        const planeObject = this.requireSketchPlaneObject(partStudio, sketch);

        return {
            feature,
            partStudio,
            partStudioId: input.partStudioId,
            payloadId,
            plane: referencePlaneToPlane(planeObject),
            planeObject,
            sketch,
            sketchFeatureId: input.sketchFeatureId,
        };
    }

    private requirePartStudio(partStudioId: string): PartStudio {
        const partStudio = this.document.partStudioStore.find(partStudioId);

        if (!partStudio) {
            throw new Error(`Document edit failed: PartStudio ${partStudioId} was not found.`);
        }

        return partStudio;
    }

    private requireSketchFeature(partStudio: PartStudio, sketchFeatureId: string): Feature {
        const feature = partStudio.findFeatureById(sketchFeatureId);

        if (!feature) {
            throw new Error(`Document edit failed: Feature ${sketchFeatureId} was not found.`);
        }

        if (feature.type !== 'sketch' || !feature.payloadRef) {
            throw new Error(`Document edit failed: Feature ${sketchFeatureId} is not a sketch.`);
        }

        return feature;
    }

    private requireSketchPayload(partStudio: PartStudio, payloadId: FeaturePayloadId): Sketch {
        const payload = partStudio.findFeaturePayload(payloadId);

        if (!(payload instanceof Sketch)) {
            throw new Error(`Document edit failed: Sketch payload ${payloadId} was not found.`);
        }

        return payload;
    }

    private requireSketchPlaneObject(partStudio: PartStudio, sketch: Sketch): ReferencePlaneObject {
        const planeObject = partStudio.findObjectById(sketch.plane.planeObjectRef.id);

        if (!(planeObject instanceof ReferencePlaneObject)) {
            throw new Error(
                `Document edit failed: Sketch plane object ${sketch.plane.planeObjectRef.id} was not found.`,
            );
        }

        return planeObject;
    }
}
