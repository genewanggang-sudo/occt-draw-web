import type { DocumentRequest } from '@occt-draw/core';
import type { Vector2 } from '@occt-draw/math';
import { SketchEntityKind } from '@occt-draw/sketch';
import type {
    Sketch,
    SketchEdgeId,
    SketchEntityRef,
    SketchLineSegmentInput,
    SketchVertexId,
} from '@occt-draw/sketch';
import type { CadDocument } from './document';
import type { CadDocumentWriteContext, SketchWriteTarget } from './documentWriteContext';
import type { FeatureId, FeaturePayloadId, PartStudioId } from './ids';

export interface SketchDocumentRequestContext {
    readonly partStudioId: PartStudioId;
    readonly sketchFeatureId: FeatureId;
}

abstract class SketchDocumentRequest<TResult> implements DocumentRequest<
    CadDocument,
    TResult,
    CadDocumentWriteContext
> {
    public readonly id: string;
    public readonly label: string;
    protected readonly partStudioId: PartStudioId;
    protected readonly sketchFeatureId: FeatureId;

    protected constructor(input: {
        readonly label: string;
        readonly partStudioId: PartStudioId;
        readonly sketchFeatureId: FeatureId;
        readonly transactionId: string;
    }) {
        this.id = input.transactionId;
        this.label = input.label;
        this.partStudioId = input.partStudioId;
        this.sketchFeatureId = input.sketchFeatureId;
    }

    public execute(context: CadDocumentWriteContext): TResult {
        const target = context.requireSketchTarget({
            partStudioId: this.partStudioId,
            sketchFeatureId: this.sketchFeatureId,
        });

        return this.apply(target);
    }

    protected abstract apply(target: SketchWriteTarget): TResult;
}

export interface AddLineSegmentRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeId: SketchEdgeId | null;
    readonly createdEndVertexId: SketchVertexId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddLineSegmentRequest
    extends SketchDocumentRequest<AddLineSegmentRequestResult>
    implements DocumentRequest<CadDocument, AddLineSegmentRequestResult, CadDocumentWriteContext>
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

    protected apply(target: SketchWriteTarget): AddLineSegmentRequestResult {
        const result = target.primitives.addLineSegment(this.input);

        return {
            createdEdgeId: result?.createdEdgeId ?? null,
            createdEndVertexId: result?.createdVertexId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddClosedLineSegmentsRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeIds: readonly SketchEdgeId[];
    readonly payloadId: FeaturePayloadId;
}

export class AddClosedLineSegmentsRequest
    extends SketchDocumentRequest<AddClosedLineSegmentsRequestResult>
    implements
        DocumentRequest<CadDocument, AddClosedLineSegmentsRequestResult, CadDocumentWriteContext>
{
    private readonly points: readonly Vector2[];

    constructor(input: SketchDocumentRequestContext & { readonly points: readonly Vector2[] }) {
        super({
            label: 'Add sketch line segments',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-line-segments:${input.sketchFeatureId}`,
        });
        this.points = input.points;
    }

    protected apply(target: SketchWriteTarget): AddClosedLineSegmentsRequestResult {
        const result = target.primitives.addClosedPolyline(this.points);

        return {
            createdEdgeIds: result?.createdEdgeIds ?? [],
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddCornerRectangleRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeIds: readonly SketchEdgeId[];
    readonly payloadId: FeaturePayloadId;
}

export class AddCornerRectangleRequest
    extends SketchDocumentRequest<AddCornerRectangleRequestResult>
    implements
        DocumentRequest<CadDocument, AddCornerRectangleRequestResult, CadDocumentWriteContext>
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

    protected apply(target: SketchWriteTarget): AddCornerRectangleRequestResult {
        const result = target.primitives.addRectangleFromCorners(
            this.firstCorner,
            this.oppositeCorner,
        );

        return {
            createdEdgeIds: result?.createdEdgeIds ?? [],
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddCircleRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddCircleRequest
    extends SketchDocumentRequest<AddCircleRequestResult>
    implements DocumentRequest<CadDocument, AddCircleRequestResult, CadDocumentWriteContext>
{
    private readonly center: Vector2;
    private readonly radius: number;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly center: Vector2;
            readonly radius: number;
        },
    ) {
        super({
            label: 'Add sketch circle',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-circle:${input.sketchFeatureId}`,
        });
        this.center = input.center;
        this.radius = input.radius;
    }

    protected apply(target: SketchWriteTarget): AddCircleRequestResult {
        const result = target.primitives.addCircle(this.center, this.radius);

        return {
            createdCurveId: result?.createdCurveId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface DeleteSketchEntityRequestResult extends SketchDocumentRequestContext {
    readonly deletedEntityRef: SketchEntityRef;
    readonly payloadId: FeaturePayloadId;
}

export class DeleteSketchEntityRequest
    extends SketchDocumentRequest<DeleteSketchEntityRequestResult>
    implements
        DocumentRequest<CadDocument, DeleteSketchEntityRequestResult, CadDocumentWriteContext>
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

    protected apply(target: SketchWriteTarget): DeleteSketchEntityRequestResult {
        target.primitives.deleteEntity(this.entityRef);

        return {
            deletedEntityRef: this.entityRef,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
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
    extends SketchDocumentRequest<MoveVertexRequestResult>
    implements DocumentRequest<CadDocument, MoveVertexRequestResult, CadDocumentWriteContext>
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

    protected apply(target: SketchWriteTarget): MoveVertexRequestResult {
        target.primitives.moveVertex(this.vertexId, this.target);

        return {
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
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

export type LineSegmentEditInput = SketchLineSegmentInput;

export function isEditableSketchEntityRef(ref: SketchEntityRef): boolean {
    return ref.kind === SketchEntityKind.Edge || ref.kind === SketchEntityKind.Vertex;
}
