import {
    createRequestExecution,
    Transaction,
    type DocumentEditLabels,
    type Request,
    type RequestContext,
    type RequestExecution,
    type TransactionId,
} from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';
import {
    AddCornerRectangleEdit,
    AddLineSegmentEdit,
    DeleteSketchEntityEdit,
    MoveVertexEdit,
    Sketch,
    SketchEntityKind,
    createSketchEditTransaction,
    type SketchEdgeId,
    type SketchEntityRef,
    type SketchEdit,
    type SketchVertexId,
} from '@occt-draw/sketch';
import type { CadDocument, PartStudio } from './document';
import { ApplySketchTransactionOperation } from './documentOperations';
import type { Feature } from './features';
import type { FeatureId, FeaturePayloadId, PartStudioId } from './ids';

export interface SketchDocumentRequestContext {
    readonly partStudioId: PartStudioId;
    readonly sketchFeatureId: FeatureId;
}

abstract class SketchDocumentRequest<TResult, TEdit extends SketchEdit> implements Request<
    CadDocument,
    TResult
> {
    public readonly label: string;
    protected readonly partStudioId: PartStudioId;
    protected readonly sketchFeatureId: FeatureId;
    private readonly history: DocumentEditLabels;
    private readonly transactionId: TransactionId;

    protected constructor(input: {
        readonly label: string;
        readonly partStudioId: PartStudioId;
        readonly sketchFeatureId: FeatureId;
        readonly transactionId: TransactionId;
    }) {
        this.history = { label: input.label };
        this.label = input.label;
        this.partStudioId = input.partStudioId;
        this.sketchFeatureId = input.sketchFeatureId;
        this.transactionId = input.transactionId;
    }

    public execute(context: RequestContext<CadDocument>): RequestExecution<CadDocument, TResult> {
        const partStudio = findPartStudioOrThrow(context.document, this.partStudioId);
        const { payloadId, sketch } = findSketchPayloadOrThrow(partStudio, this.sketchFeatureId);
        const edit = this.createEdit();
        const sketchEdit = createSketchEditTransaction({
            edit,
            id: this.transactionId,
            label: this.label,
            readResult: (appliedEdit) => this.readResult(sketch, appliedEdit),
            sketch,
        });
        const transaction = new Transaction<CadDocument>({
            id: this.transactionId,
            label: this.label,
            operations: sketchEdit.transaction.isEmpty()
                ? []
                : [
                      new ApplySketchTransactionOperation({
                          label: this.label,
                          partStudioId: this.partStudioId,
                          payloadId,
                          sketchTransaction: sketchEdit.transaction,
                      }),
                  ],
        });

        return createRequestExecution({
            history: this.history,
            result: sketchEdit.result,
            transaction,
        });
    }

    protected abstract createEdit(): TEdit;

    protected abstract readResult(sketch: Sketch, edit: TEdit): TResult;
}

export interface AddLineSegmentRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeId: SketchEdgeId | null;
    readonly createdEndVertexId: SketchVertexId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddLineSegmentRequest
    extends SketchDocumentRequest<AddLineSegmentRequestResult, AddLineSegmentEdit>
    implements Request<CadDocument, AddLineSegmentRequestResult>
{
    private readonly input: LineSegmentEditInput;

    constructor(input: SketchDocumentRequestContext & LineSegmentEditInput) {
        super({
            label: 'Add sketch line',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-line:${input.sketchFeatureId}`,
        });
        this.input = input;
    }

    protected createEdit(): AddLineSegmentEdit {
        return new AddLineSegmentEdit(this.input);
    }

    protected readResult(sketch: Sketch, edit: AddLineSegmentEdit): AddLineSegmentRequestResult {
        return {
            createdEdgeId: edit.createdEdgeId,
            createdEndVertexId: edit.createdEndVertexId,
            partStudioId: this.partStudioId,
            payloadId: sketch.id,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddCornerRectangleRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeIds: readonly SketchEdgeId[];
    readonly payloadId: FeaturePayloadId;
}

export class AddCornerRectangleRequest
    extends SketchDocumentRequest<AddCornerRectangleRequestResult, AddCornerRectangleEdit>
    implements Request<CadDocument, AddCornerRectangleRequestResult>
{
    private readonly firstCorner: Vector2;
    private readonly oppositeCorner: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly firstCorner: Vector2;
            readonly oppositeCorner: Vector2;
        },
    ) {
        super({
            label: 'Add sketch rectangle',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-rectangle:${input.sketchFeatureId}`,
        });
        this.firstCorner = input.firstCorner;
        this.oppositeCorner = input.oppositeCorner;
    }

    protected createEdit(): AddCornerRectangleEdit {
        return new AddCornerRectangleEdit({
            firstCorner: this.firstCorner,
            oppositeCorner: this.oppositeCorner,
        });
    }

    protected readResult(
        sketch: Sketch,
        edit: AddCornerRectangleEdit,
    ): AddCornerRectangleRequestResult {
        return {
            createdEdgeIds: edit.createdEdgeIds,
            partStudioId: this.partStudioId,
            payloadId: sketch.id,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface DeleteSketchEntityRequestResult extends SketchDocumentRequestContext {
    readonly deletedEntityRef: SketchEntityRef;
    readonly payloadId: FeaturePayloadId;
}

export class DeleteSketchEntityRequest
    extends SketchDocumentRequest<DeleteSketchEntityRequestResult, DeleteSketchEntityEdit>
    implements Request<CadDocument, DeleteSketchEntityRequestResult>
{
    private readonly entityRef: SketchEntityRef;

    constructor(input: SketchDocumentRequestContext & { readonly entityRef: SketchEntityRef }) {
        super({
            label: 'Delete sketch entity',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `delete-sketch-entity:${input.sketchFeatureId}:${input.entityRef.kind}:${input.entityRef.id}`,
        });
        this.entityRef = input.entityRef;
    }

    protected createEdit(): DeleteSketchEntityEdit {
        return new DeleteSketchEntityEdit({ entityRef: this.entityRef });
    }

    protected readResult(sketch: Sketch): DeleteSketchEntityRequestResult {
        return {
            deletedEntityRef: this.entityRef,
            partStudioId: this.partStudioId,
            payloadId: sketch.id,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface MoveVertexRequestResult extends SketchDocumentRequestContext {
    readonly payloadId: FeaturePayloadId;
    readonly target: Vector2;
    readonly vertexId: SketchVertexId;
}

export class MoveVertexRequest
    extends SketchDocumentRequest<MoveVertexRequestResult, MoveVertexEdit>
    implements Request<CadDocument, MoveVertexRequestResult>
{
    private readonly target: Vector2;
    private readonly vertexId: SketchVertexId;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly target: Vector2;
            readonly vertexId: SketchVertexId;
        },
    ) {
        super({
            label: 'Move sketch vertex',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `move-sketch-vertex:${input.sketchFeatureId}:${input.vertexId}`,
        });
        this.target = input.target;
        this.vertexId = input.vertexId;
    }

    protected createEdit(): MoveVertexEdit {
        return new MoveVertexEdit({
            target: this.target,
            vertexId: this.vertexId,
        });
    }

    protected readResult(sketch: Sketch): MoveVertexRequestResult {
        return {
            partStudioId: this.partStudioId,
            payloadId: sketch.id,
            sketchFeatureId: this.sketchFeatureId,
            target: this.target,
            vertexId: this.vertexId,
        };
    }
}

export function predictLineSegmentEndVertexId(
    sketch: Sketch,
    input: LineSegmentEditInput,
): SketchVertexId | null {
    if ('endVertexId' in input) {
        return input.endVertexId;
    }

    const snapshot = sketch.state.snapshot();
    const allocatedBeforeEnd = 'startVertexId' in input ? 0 : 1;

    return `${sketch.id}:vertex:${String(snapshot.nextVertexIndex + allocatedBeforeEnd)}`;
}

export type LineSegmentEditInput =
    | { readonly endPosition: Vector2; readonly startPosition: Vector2 }
    | { readonly endPosition: Vector2; readonly startVertexId: SketchVertexId }
    | { readonly endVertexId: SketchVertexId; readonly startPosition: Vector2 }
    | { readonly endVertexId: SketchVertexId; readonly startVertexId: SketchVertexId };

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId): PartStudio {
    const partStudio = document.partStudioStore.find(partStudioId);

    if (!partStudio) {
        throw new Error(`Sketch request failed: PartStudio ${partStudioId} was not found.`);
    }

    return partStudio;
}

function findSketchPayloadOrThrow(
    partStudio: PartStudio,
    sketchFeatureId: FeatureId,
): {
    readonly feature: Feature;
    readonly payloadId: FeaturePayloadId;
    readonly sketch: Sketch;
} {
    const feature = partStudio.findFeatureById(sketchFeatureId);

    if (!feature) {
        throw new Error(`Sketch request failed: Feature ${sketchFeatureId} was not found.`);
    }

    if (feature.type !== 'sketch' || !feature.payloadRef) {
        throw new Error(`Sketch request failed: Feature ${sketchFeatureId} is not a sketch.`);
    }

    const payload = partStudio.findFeaturePayload(feature.payloadRef.id);

    if (!(payload instanceof Sketch)) {
        throw new Error(
            `Sketch request failed: Sketch payload ${feature.payloadRef.id} was not found.`,
        );
    }

    return {
        feature,
        payloadId: feature.payloadRef.id,
        sketch: payload,
    };
}

export function isEditableSketchEntityRef(ref: SketchEntityRef): boolean {
    return ref.kind === SketchEntityKind.Edge || ref.kind === SketchEntityKind.Vertex;
}
