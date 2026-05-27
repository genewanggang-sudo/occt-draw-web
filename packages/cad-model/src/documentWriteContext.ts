import {
    ModelChangeSetBuilder,
    Transaction,
    type DocumentMutationInput,
    type DocumentMutationRuntime,
    type DocumentWriteContext,
    type ModelChangeSet,
    type MutationScope,
} from '@occt-draw/core';
import type { Plane3 } from '@occt-draw/math';
import { Sketch, SketchChangeRecorder, SketchPrimitiveBuilder } from '@occt-draw/sketch';
import type { CadDocument, FeaturePayload, PartStudio } from './document';
import {
    createFeaturePayloadChangeSet,
    createFeaturePayloadCreationChangeSet,
    findPartStudioOrThrow,
    withPartStudio,
} from './documentChanges';
import type { Feature } from './features';
import type { FeatureId, FeaturePayloadId, PartStudioId } from './ids';
import { ReferencePlaneObject, referencePlaneToPlane } from './objects';

export interface CadDocumentWriteContext extends DocumentWriteContext<CadDocument> {
    createFeaturePayload(input: {
        readonly feature: Feature;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly partStudioId: PartStudioId;
    }): void;
    requireSketchTarget(input: SketchTargetInput): SketchWriteTarget;
    setFeaturePayload(input: {
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly partStudioId: PartStudioId;
    }): void;
}

export interface SketchTargetInput {
    readonly partStudioId: PartStudioId;
    readonly sketchFeatureId: FeatureId;
}

export interface SketchReadTarget {
    readonly feature: Feature;
    readonly partStudio: PartStudio;
    readonly partStudioId: PartStudioId;
    readonly payloadId: FeaturePayloadId;
    readonly plane: Plane3;
    readonly planeObject: ReferencePlaneObject;
    readonly sketch: Sketch;
    readonly sketchFeatureId: FeatureId;
}

export interface SketchWriteTarget {
    readonly partStudioId: PartStudioId;
    readonly payloadId: FeaturePayloadId;
    readonly plane: Plane3;
    readonly primitives: SketchPrimitiveBuilder;
    readonly sketchFeatureId: FeatureId;
}

interface TrackedSketchTarget extends SketchReadTarget {
    readonly primitives: SketchPrimitiveBuilder;
    readonly recorder: SketchChangeRecorder;
    readonly writeTarget: SketchWriteTarget;
}

class CadDocumentWriteContextImpl implements CadDocumentWriteContext {
    private readonly scope: CadDocumentMutationScope;

    constructor(scope: CadDocumentMutationScope) {
        this.scope = scope;
    }

    public createFeaturePayload(input: {
        readonly feature: Feature;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly partStudioId: PartStudioId;
    }): void {
        this.scope.recordChangeSet(
            createFeaturePayloadCreationChangeSet({
                document: this.scope.liveDocument,
                feature: input.feature,
                label: this.scope.label,
                partStudioId: input.partStudioId,
                payload: input.payload,
                payloadId: input.payloadId,
            }),
        );
    }

    public requireSketchTarget(input: SketchTargetInput): SketchWriteTarget {
        return this.scope.requireSketchTarget(input);
    }

    public setFeaturePayload(input: {
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly partStudioId: PartStudioId;
    }): void {
        this.scope.recordChangeSet(
            createFeaturePayloadChangeSet({
                document: this.scope.liveDocument,
                label: this.scope.label,
                partStudioId: input.partStudioId,
                payload: input.payload,
                payloadId: input.payloadId,
            }),
        );
    }
}

class CadDocumentMutationScope implements MutationScope<CadDocument, CadDocumentWriteContext> {
    public readonly context: CadDocumentWriteContext;
    public readonly id: string;
    public readonly label: string;
    public readonly liveDocument: CadDocument;
    private readonly directChanges = new ModelChangeSetBuilder<CadDocument>();
    private readonly sketchTargets = new Map<string, TrackedSketchTarget>();
    private discarded = false;

    constructor(input: DocumentMutationInput<CadDocument>) {
        this.id = input.id;
        this.label = input.label;
        this.liveDocument = input.document;
        this.context = new CadDocumentWriteContextImpl(this);
    }

    public get workingDocument(): CadDocument {
        return this.buildChangeSet().apply(this.liveDocument);
    }

    public commit(): Transaction<CadDocument> {
        this.assertActive();

        return new Transaction({
            changeSet: this.buildChangeSet(),
            id: this.id,
            label: this.label,
        });
    }

    public discard(): void {
        this.discarded = true;
        this.sketchTargets.clear();
    }

    public recordChangeSet(changeSet: ModelChangeSet<CadDocument>): void {
        this.assertActive();
        this.directChanges.recordChangeSet(changeSet);
    }

    public requireSketchTarget(input: SketchTargetInput): SketchWriteTarget {
        this.assertActive();

        const key = createSketchTargetKey(input);
        const cached = this.sketchTargets.get(key);

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
        const plane = referencePlaneToPlane(planeObject);
        const recorder = new SketchChangeRecorder(this.label);
        const primitives = new SketchPrimitiveBuilder(sketch, { recorder });
        const target: TrackedSketchTarget = {
            feature,
            partStudio,
            partStudioId: input.partStudioId,
            payloadId,
            plane,
            planeObject,
            primitives,
            recorder,
            sketch,
            sketchFeatureId: input.sketchFeatureId,
            writeTarget: {
                partStudioId: input.partStudioId,
                payloadId,
                plane,
                primitives,
                sketchFeatureId: input.sketchFeatureId,
            },
        };

        this.sketchTargets.set(key, target);

        return target.writeTarget;
    }

    private buildChangeSet(): ModelChangeSet<CadDocument> {
        const builder = ModelChangeSetBuilder.from(this.directChanges.toChangeSet());

        for (const target of this.sketchTargets.values()) {
            if (target.recorder.isEmpty()) {
                continue;
            }

            builder.recordChangeSet(mapSketchChangeSetToDocument(target));
        }

        return builder.toChangeSet();
    }

    private assertActive(): void {
        if (this.discarded) {
            throw new Error(`Cannot use discarded document mutation scope ${this.id}.`);
        }
    }

    private requirePartStudio(partStudioId: PartStudioId): PartStudio {
        return findPartStudioOrThrow(this.liveDocument, partStudioId);
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

function mapSketchChangeSetToDocument(target: TrackedSketchTarget): ModelChangeSet<CadDocument> {
    return target.recorder.toChangeSet().map<CadDocument>({
        get: (document) => {
            const payload = findPartStudioOrThrow(document, target.partStudioId).findFeaturePayload(
                target.payloadId,
            );

            if (!(payload instanceof Sketch)) {
                throw new Error(
                    `Document edit failed: Sketch payload ${target.payloadId} was not found.`,
                );
            }

            return payload.clone();
        },
        replace: (document, sketch) =>
            withPartStudio(
                document,
                findPartStudioOrThrow(document, target.partStudioId).setFeaturePayload(
                    target.payloadId,
                    sketch,
                ),
            ),
    });
}

function createSketchTargetKey(input: SketchTargetInput): string {
    return `${input.partStudioId}:${input.sketchFeatureId}`;
}

export function createCadDocumentMutationRuntime(): DocumentMutationRuntime<
    CadDocument,
    CadDocumentWriteContext
> {
    return {
        begin: (input) => new CadDocumentMutationScope(input),
    };
}
