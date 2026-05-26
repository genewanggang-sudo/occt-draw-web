import {
    ModelChangeSet,
    Transaction,
    createRequestExecution,
    type DocumentEditLabels,
    type RequestExecution,
    type TransactionId,
} from '@occt-draw/core';
import type { Plane3, Vector2 } from '@occt-draw/math';
import {
    Sketch,
    SketchPrimitiveBuilder,
    type SketchEntityRef,
    type SketchLineSegmentInput,
    type SketchPrimitiveResult,
    type SketchVertexId,
} from '@occt-draw/sketch';
import type { CadDocument, PartStudio } from './document';
import { createFeaturePayloadChangeSet } from './documentChanges';
import type { Feature } from './features';
import type { FeatureId, FeaturePayloadId, PartStudioId } from './ids';
import { ReferencePlaneObject, referencePlaneToPlane } from './objects';

export interface CadDocumentEditContextInput extends DocumentEditLabels {
    readonly id: TransactionId;
    readonly label: string;
}

export interface SketchTargetInput {
    readonly partStudioId: PartStudioId;
    readonly sketchFeatureId: FeatureId;
}

export interface SketchEditTarget {
    readonly feature: Feature;
    readonly partStudio: PartStudio;
    readonly partStudioId: PartStudioId;
    readonly payloadId: FeaturePayloadId;
    readonly plane: Plane3;
    readonly planeObject: ReferencePlaneObject;
    readonly primitives: SketchPrimitiveBuilder;
    readonly sketch: Sketch;
    readonly sketchFeatureId: FeatureId;
}

interface TrackedSketchTarget extends SketchEditTarget {
    readonly changed: () => boolean;
}

export class CadDocumentEditContext {
    private readonly document: CadDocument;
    private readonly history: DocumentEditLabels;
    private readonly id: TransactionId;
    private readonly label: string;
    private readonly targets = new Map<string, TrackedSketchTarget>();

    private constructor(document: CadDocument, input: CadDocumentEditContextInput) {
        this.document = document;
        this.history = {
            label: input.label,
            redoLabel: input.redoLabel,
            undoLabel: input.undoLabel,
        };
        this.id = input.id;
        this.label = input.label;
    }

    public static begin(
        document: CadDocument,
        input: CadDocumentEditContextInput,
    ): CadDocumentEditContext {
        return new CadDocumentEditContext(document, input);
    }

    public requireSketchTarget(input: SketchTargetInput): SketchEditTarget {
        const key = createSketchTargetKey(input);
        const cached = this.targets.get(key);

        if (cached) {
            return cached;
        }

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
        const target = createTrackedSketchTarget({
            feature,
            partStudio,
            partStudioId: input.partStudioId,
            payloadId,
            plane: referencePlaneToPlane(planeObject),
            planeObject,
            sketch,
            sketchFeatureId: input.sketchFeatureId,
        });

        this.targets.set(key, target);

        return target;
    }

    public finish<TResult>(result: TResult): RequestExecution<CadDocument, TResult> {
        let changeSet = ModelChangeSet.empty<CadDocument>();

        for (const target of this.targets.values()) {
            if (!target.changed()) {
                continue;
            }

            changeSet = changeSet.mergeWith(
                createFeaturePayloadChangeSet({
                    document: this.document,
                    label: this.label,
                    partStudioId: target.partStudioId,
                    payload: target.sketch,
                    payloadId: target.payloadId,
                }),
            );
        }

        return createRequestExecution({
            history: this.history,
            result,
            transaction: new Transaction<CadDocument>({
                changeSet,
                id: this.id,
                label: this.label,
            }),
        });
    }

    private requirePartStudio(partStudioId: PartStudioId): PartStudio {
        const partStudio = this.document.partStudioStore.find(partStudioId);

        if (!partStudio) {
            throw new Error(`Document edit failed: PartStudio ${partStudioId} was not found.`);
        }

        return partStudio;
    }

    private requireSketchFeature(partStudio: PartStudio, sketchFeatureId: FeatureId): Feature {
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

function createTrackedSketchTarget(
    input: Omit<SketchEditTarget, 'primitives'>,
): TrackedSketchTarget {
    let changed = false;
    const primitives = new TrackedSketchPrimitiveBuilder(input.sketch, () => {
        changed = true;
    });

    return {
        ...input,
        changed: () => changed,
        primitives,
    };
}

class TrackedSketchPrimitiveBuilder extends SketchPrimitiveBuilder {
    private readonly markChanged: () => void;

    constructor(sketch: Sketch, markChanged: () => void) {
        super(sketch);
        this.markChanged = markChanged;
    }

    public override addPoint(position: Vector2): SketchPrimitiveResult {
        const result = super.addPoint(position);
        this.track(result);

        return result;
    }

    public override addLineSegment(input: SketchLineSegmentInput): SketchPrimitiveResult | null {
        return this.track(super.addLineSegment(input));
    }

    public override addClosedPolyline(points: readonly Vector2[]): SketchPrimitiveResult | null {
        return this.track(super.addClosedPolyline(points));
    }

    public override addRectangleFromCorners(
        firstCorner: Vector2,
        oppositeCorner: Vector2,
    ): SketchPrimitiveResult | null {
        return this.track(super.addRectangleFromCorners(firstCorner, oppositeCorner));
    }

    public override addCircle(center: Vector2, radius: number): SketchPrimitiveResult | null {
        return this.track(super.addCircle(center, radius));
    }

    public override deleteEntity(entityRef: SketchEntityRef): SketchPrimitiveResult | null {
        return this.track(super.deleteEntity(entityRef));
    }

    public override moveVertex(
        vertexId: SketchVertexId,
        target: Vector2,
    ): SketchPrimitiveResult | null {
        return this.track(super.moveVertex(vertexId, target));
    }

    private track<TResult extends SketchPrimitiveResult | null>(result: TResult): TResult {
        if (result !== null) {
            this.markChanged();
        }

        return result;
    }
}

function createSketchTargetKey(input: SketchTargetInput): string {
    return `${input.partStudioId}:${input.sketchFeatureId}`;
}
