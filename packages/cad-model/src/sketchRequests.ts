import type { DocumentRequest } from '@occt-draw/core';
import type { FitSplineParameterization, RegularPolygonMode, Vector2 } from '@occt-draw/math';
import { SketchEntityKind } from '@occt-draw/sketch';
import type {
    Sketch,
    SketchEdgeId,
    SketchEntityRef,
    SketchFitSplineInput,
    SketchLineSegmentInput,
    SketchPointId,
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

export interface AddSketchPointRequestResult extends SketchDocumentRequestContext {
    readonly createdPointId: SketchPointId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddSketchPointRequest
    extends SketchDocumentRequest<AddSketchPointRequestResult>
    implements DocumentRequest<CadDocument, AddSketchPointRequestResult, CadDocumentWriteContext>
{
    private readonly position: Vector2;

    constructor(input: SketchDocumentRequestContext & { readonly position: Vector2 }) {
        super({
            label: 'Add sketch point',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-point:${input.sketchFeatureId}`,
        });
        this.position = input.position;
    }

    protected apply(target: SketchWriteTarget): AddSketchPointRequestResult {
        const result = target.primitives.addSketchPoint(this.position);

        return {
            createdPointId: result.createdPointId ?? null,
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

export interface AddFitSplineRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly createdEndVertexId: SketchVertexId | null;
    readonly createdStartVertexId: SketchVertexId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddFitSplineRequest
    extends SketchDocumentRequest<AddFitSplineRequestResult>
    implements DocumentRequest<CadDocument, AddFitSplineRequestResult, CadDocumentWriteContext>
{
    private readonly input: SketchFitSplineInput;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly closed?: boolean;
            readonly degree?: number;
            readonly endTangent?: Vector2 | undefined;
            readonly fitPoints: readonly Vector2[];
            readonly parameterization?: FitSplineParameterization;
            readonly startTangent?: Vector2 | undefined;
        },
    ) {
        super({
            label: 'Add sketch fit spline',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-fit-spline:${input.sketchFeatureId}`,
        });
        this.input = input;
    }

    protected apply(target: SketchWriteTarget): AddFitSplineRequestResult {
        const result = target.primitives.addFitSpline(this.input);

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            createdEndVertexId: result?.createdEndVertexId ?? null,
            createdStartVertexId: result?.createdStartVertexId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddRegularPolygonRequestResult extends SketchDocumentRequestContext {
    readonly createdEdgeIds: readonly SketchEdgeId[];
    readonly payloadId: FeaturePayloadId;
}

export class AddRegularPolygonRequest
    extends SketchDocumentRequest<AddRegularPolygonRequestResult>
    implements DocumentRequest<CadDocument, AddRegularPolygonRequestResult, CadDocumentWriteContext>
{
    private readonly center: Vector2;
    private readonly mode: RegularPolygonMode;
    private readonly referencePoint: Vector2;
    private readonly sideCount: number;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly center: Vector2;
            readonly mode: RegularPolygonMode;
            readonly referencePoint: Vector2;
            readonly sideCount: number;
        },
    ) {
        super({
            label: `Add sketch ${input.mode} polygon`,
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-${input.mode}-polygon:${input.sketchFeatureId}`,
        });
        this.center = input.center;
        this.mode = input.mode;
        this.referencePoint = input.referencePoint;
        this.sideCount = input.sideCount;
    }

    protected apply(target: SketchWriteTarget): AddRegularPolygonRequestResult {
        const result = target.primitives.addRegularPolygonByCenterReference(
            this.center,
            this.referencePoint,
            this.sideCount,
            this.mode,
        );

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

export interface AddThreePointCircleRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddThreePointCircleRequest
    extends SketchDocumentRequest<AddThreePointCircleRequestResult>
    implements
        DocumentRequest<CadDocument, AddThreePointCircleRequestResult, CadDocumentWriteContext>
{
    private readonly firstPoint: Vector2;
    private readonly secondPoint: Vector2;
    private readonly thirdPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly firstPoint: Vector2;
            readonly secondPoint: Vector2;
            readonly thirdPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch 3 point circle',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-3-point-circle:${input.sketchFeatureId}`,
        });
        this.firstPoint = input.firstPoint;
        this.secondPoint = input.secondPoint;
        this.thirdPoint = input.thirdPoint;
    }

    protected apply(target: SketchWriteTarget): AddThreePointCircleRequestResult {
        const result = target.primitives.addCircleThroughPoints(
            this.firstPoint,
            this.secondPoint,
            this.thirdPoint,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddThreePointArcRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddThreePointArcRequest
    extends SketchDocumentRequest<AddThreePointArcRequestResult>
    implements DocumentRequest<CadDocument, AddThreePointArcRequestResult, CadDocumentWriteContext>
{
    private readonly endPoint: Vector2;
    private readonly radiusPoint: Vector2;
    private readonly startPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly endPoint: Vector2;
            readonly radiusPoint: Vector2;
            readonly startPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch 3 point arc',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-3-point-arc:${input.sketchFeatureId}`,
        });
        this.endPoint = input.endPoint;
        this.radiusPoint = input.radiusPoint;
        this.startPoint = input.startPoint;
    }

    protected apply(target: SketchWriteTarget): AddThreePointArcRequestResult {
        const result = target.primitives.addArcByStartEndRadiusPoint(
            this.startPoint,
            this.endPoint,
            this.radiusPoint,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddCenterPointArcRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddCenterPointArcRequest
    extends SketchDocumentRequest<AddCenterPointArcRequestResult>
    implements DocumentRequest<CadDocument, AddCenterPointArcRequestResult, CadDocumentWriteContext>
{
    private readonly centerPoint: Vector2;
    private readonly endDirectionPoint: Vector2;
    private readonly startPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly centerPoint: Vector2;
            readonly endDirectionPoint: Vector2;
            readonly startPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch center point arc',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-center-point-arc:${input.sketchFeatureId}`,
        });
        this.centerPoint = input.centerPoint;
        this.endDirectionPoint = input.endDirectionPoint;
        this.startPoint = input.startPoint;
    }

    protected apply(target: SketchWriteTarget): AddCenterPointArcRequestResult {
        const result = target.primitives.addArcByCenterStartEndPoint(
            this.centerPoint,
            this.startPoint,
            this.endDirectionPoint,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddTangentArcRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly createdEndVertexId: SketchVertexId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddTangentArcRequest
    extends SketchDocumentRequest<AddTangentArcRequestResult>
    implements DocumentRequest<CadDocument, AddTangentArcRequestResult, CadDocumentWriteContext>
{
    private readonly endPoint: Vector2;
    private readonly startTangent: Vector2;
    private readonly startVertexId: SketchVertexId;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly endPoint: Vector2;
            readonly startTangent: Vector2;
            readonly startVertexId: SketchVertexId;
        },
    ) {
        super({
            label: 'Add sketch tangent arc',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-tangent-arc:${input.sketchFeatureId}`,
        });
        this.endPoint = input.endPoint;
        this.startTangent = input.startTangent;
        this.startVertexId = input.startVertexId;
    }

    protected apply(target: SketchWriteTarget): AddTangentArcRequestResult {
        const result = target.primitives.addArcByStartVertexTangentEndPoint(
            this.startVertexId,
            this.startTangent,
            this.endPoint,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            createdEndVertexId: result?.createdVertexId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddEllipticalArcRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddEllipticalArcRequest
    extends SketchDocumentRequest<AddEllipticalArcRequestResult>
    implements DocumentRequest<CadDocument, AddEllipticalArcRequestResult, CadDocumentWriteContext>
{
    private readonly centerPoint: Vector2;
    private readonly endAngleRadians: number;
    private readonly endPoint: Vector2;
    private readonly primaryAxisPoint: Vector2;
    private readonly secondaryPoint: Vector2;
    private readonly startAngleRadians: number;
    private readonly startPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly centerPoint: Vector2;
            readonly endAngleRadians: number;
            readonly endPoint: Vector2;
            readonly primaryAxisPoint: Vector2;
            readonly secondaryPoint: Vector2;
            readonly startAngleRadians: number;
            readonly startPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch elliptical arc',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-elliptical-arc:${input.sketchFeatureId}`,
        });
        this.centerPoint = input.centerPoint;
        this.endAngleRadians = input.endAngleRadians;
        this.endPoint = input.endPoint;
        this.primaryAxisPoint = input.primaryAxisPoint;
        this.secondaryPoint = input.secondaryPoint;
        this.startAngleRadians = input.startAngleRadians;
        this.startPoint = input.startPoint;
    }

    protected apply(target: SketchWriteTarget): AddEllipticalArcRequestResult {
        const result = target.primitives.addEllipticalArcByCenterAxes(
            this.centerPoint,
            this.primaryAxisPoint,
            this.secondaryPoint,
            this.startPoint,
            this.endPoint,
            this.startAngleRadians,
            this.endAngleRadians,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddConicRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly createdEdgeId: SketchEdgeId | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddConicRequest
    extends SketchDocumentRequest<AddConicRequestResult>
    implements DocumentRequest<CadDocument, AddConicRequestResult, CadDocumentWriteContext>
{
    private readonly endPoint: Vector2;
    private readonly rho: number | undefined;
    private readonly shoulderPoint: Vector2;
    private readonly startPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly endPoint: Vector2;
            readonly rho?: number;
            readonly shoulderPoint: Vector2;
            readonly startPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch conic',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-conic:${input.sketchFeatureId}`,
        });
        this.endPoint = input.endPoint;
        this.rho = input.rho;
        this.shoulderPoint = input.shoulderPoint;
        this.startPoint = input.startPoint;
    }

    protected apply(target: SketchWriteTarget): AddConicRequestResult {
        const result = target.primitives.addConicByThreePoints(
            this.startPoint,
            this.endPoint,
            this.shoulderPoint,
            this.rho,
        );

        return {
            createdCurveId: result?.createdCurveId ?? null,
            createdEdgeId: result?.createdEdgeId ?? null,
            partStudioId: this.partStudioId,
            payloadId: target.payloadId,
            sketchFeatureId: this.sketchFeatureId,
        };
    }
}

export interface AddEllipseRequestResult extends SketchDocumentRequestContext {
    readonly createdCurveId: string | null;
    readonly payloadId: FeaturePayloadId;
}

export class AddEllipseRequest
    extends SketchDocumentRequest<AddEllipseRequestResult>
    implements DocumentRequest<CadDocument, AddEllipseRequestResult, CadDocumentWriteContext>
{
    private readonly centerPoint: Vector2;
    private readonly primaryAxisPoint: Vector2;
    private readonly secondaryPoint: Vector2;

    constructor(
        input: SketchDocumentRequestContext & {
            readonly centerPoint: Vector2;
            readonly primaryAxisPoint: Vector2;
            readonly secondaryPoint: Vector2;
        },
    ) {
        super({
            label: 'Add sketch ellipse',
            partStudioId: input.partStudioId,
            sketchFeatureId: input.sketchFeatureId,
            transactionId: `add-sketch-ellipse:${input.sketchFeatureId}`,
        });
        this.centerPoint = input.centerPoint;
        this.primaryAxisPoint = input.primaryAxisPoint;
        this.secondaryPoint = input.secondaryPoint;
    }

    protected apply(target: SketchWriteTarget): AddEllipseRequestResult {
        const result = target.primitives.addEllipseByCenterAxes(
            this.centerPoint,
            this.primaryAxisPoint,
            this.secondaryPoint,
        );

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
    return (
        ref.kind === SketchEntityKind.Curve ||
        ref.kind === SketchEntityKind.Edge ||
        ref.kind === SketchEntityKind.Point ||
        ref.kind === SketchEntityKind.Vertex
    );
}
