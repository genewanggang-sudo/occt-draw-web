import type { DocumentEditLabels, DocumentRequest } from '@occt-draw/core';
import type { CadDocument, FeaturePayload } from './document';
import type { CadDocumentWriteContext } from './documentWriteContext';
import type { Feature } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export interface CadDocumentRequestResult {
    readonly partStudioId: PartStudioId;
}

export interface CreateFeaturePayloadRequestResult extends CadDocumentRequestResult {
    readonly featureId: string;
    readonly payloadId: FeaturePayloadId;
}

export class CreateFeaturePayloadRequest implements DocumentRequest<
    CadDocument,
    CreateFeaturePayloadRequestResult,
    CadDocumentWriteContext
> {
    public readonly feature: Feature;
    public readonly id: string;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    public readonly history: DocumentEditLabels | null;

    constructor(input: {
        readonly feature: Feature;
        readonly history?: DocumentEditLabels | null;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly transactionId?: string | null;
    }) {
        this.feature = input.feature;
        this.history = input.history ?? null;
        this.id = input.transactionId ?? `create-feature-payload:${input.feature.id}`;
        this.label = input.label ?? `Create ${input.feature.name}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
    }

    public execute(context: CadDocumentWriteContext): CreateFeaturePayloadRequestResult {
        context.createFeaturePayload({
            feature: this.feature,
            partStudioId: this.partStudioId,
            payload: this.payload,
            payloadId: this.payloadId,
        });

        return {
            featureId: this.feature.id,
            partStudioId: this.partStudioId,
            payloadId: this.payloadId,
        };
    }
}

export interface SetFeaturePayloadRequestResult extends CadDocumentRequestResult {
    readonly payloadId: FeaturePayloadId;
}

export class SetFeaturePayloadRequest implements DocumentRequest<
    CadDocument,
    SetFeaturePayloadRequestResult,
    CadDocumentWriteContext
> {
    public readonly id: string;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    public readonly history: DocumentEditLabels | null;

    constructor(input: {
        readonly history?: DocumentEditLabels | null;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly transactionId?: string | null;
    }) {
        this.history = input.history ?? null;
        this.id = input.transactionId ?? `set-feature-payload:${input.payloadId}`;
        this.label = input.label ?? `Set feature payload: ${input.payloadId}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
    }

    public execute(context: CadDocumentWriteContext): SetFeaturePayloadRequestResult {
        context.setFeaturePayload({
            partStudioId: this.partStudioId,
            payload: this.payload,
            payloadId: this.payloadId,
        });

        return {
            partStudioId: this.partStudioId,
            payloadId: this.payloadId,
        };
    }
}
