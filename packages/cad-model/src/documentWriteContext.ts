import {
    ModelChangeSetBuilder,
    Transaction,
    type DocumentMutationInput,
    type DocumentMutationRuntime,
    type DocumentWriteContext,
    type ModelChangeSet,
    type MutationScope,
} from '@occt-draw/core';
import type { Plane3, Vector2 } from '@occt-draw/math';
import {
    Sketch,
    SketchChangeRecorder,
    SketchPrimitiveBuilder,
    type SketchEntityRef,
    type SketchLineSegmentInput,
    type SketchPrimitiveResult,
    type SketchVertexId,
    withActiveSketchChangeRecorder,
} from '@occt-draw/sketch';
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

export interface SketchWriteTarget extends SketchReadTarget {
    readonly primitives: SketchPrimitiveBuilder;
}

interface TrackedSketchTarget extends SketchWriteTarget {
    readonly recorder: SketchChangeRecorder;
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
        const recorder = new SketchChangeRecorder(this.label);
        const target: TrackedSketchTarget = {
            feature,
            partStudio,
            partStudioId: input.partStudioId,
            payloadId,
            plane: referencePlaneToPlane(planeObject),
            planeObject,
            primitives: new TrackedSketchPrimitiveBuilder(sketch, recorder),
            recorder,
            sketch,
            sketchFeatureId: input.sketchFeatureId,
        };

        this.sketchTargets.set(key, target);

        return target;
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

class TrackedSketchPrimitiveBuilder extends SketchPrimitiveBuilder {
    private readonly recorder: SketchChangeRecorder;

    constructor(sketch: Sketch, recorder: SketchChangeRecorder) {
        super(sketch);
        this.recorder = recorder;
    }

    public override addPoint(position: Vector2): SketchPrimitiveResult {
        return this.capture(() => super.addPoint(position));
    }

    public override addLineSegment(input: SketchLineSegmentInput): SketchPrimitiveResult | null {
        return this.capture(() => super.addLineSegment(input));
    }

    public override addClosedPolyline(points: readonly Vector2[]): SketchPrimitiveResult | null {
        return this.capture(() => super.addClosedPolyline(points));
    }

    public override addRectangleFromCorners(
        firstCorner: Vector2,
        oppositeCorner: Vector2,
    ): SketchPrimitiveResult | null {
        return this.capture(() => super.addRectangleFromCorners(firstCorner, oppositeCorner));
    }

    public override addCircle(center: Vector2, radius: number): SketchPrimitiveResult | null {
        return this.capture(() => super.addCircle(center, radius));
    }

    public override deleteEntity(entityRef: SketchEntityRef): SketchPrimitiveResult | null {
        return this.capture(() => super.deleteEntity(entityRef));
    }

    public override moveVertex(
        vertexId: SketchVertexId,
        target: Vector2,
    ): SketchPrimitiveResult | null {
        return this.capture(() => super.moveVertex(vertexId, target));
    }

    private capture<TResult>(action: () => TResult): TResult {
        return withActiveSketchChangeRecorder(this.recorder, action);
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

            return payload;
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
