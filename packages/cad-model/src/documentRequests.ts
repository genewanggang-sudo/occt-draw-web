import {
    createRequestExecution,
    Transaction,
    type DocumentEditLabels,
    type Request,
    type RequestContext,
    type RequestExecution,
    type TransactionId,
} from '@occt-draw/core';
import type { CadDocument, FeaturePayload } from './document';
import {
    createFeaturePayloadChangeSet,
    createFeaturePayloadCreationChangeSet,
} from './documentChanges';
import type { Feature } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export interface CadDocumentRequestResult {
    readonly partStudioId: PartStudioId;
}

export interface CreateFeaturePayloadRequestResult extends CadDocumentRequestResult {
    readonly featureId: string;
    readonly payloadId: FeaturePayloadId;
}

export class CreateFeaturePayloadRequest implements Request<
    CadDocument,
    CreateFeaturePayloadRequestResult
> {
    public readonly feature: Feature;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    private readonly history: DocumentEditLabels | null;
    private readonly transactionId: TransactionId | null;

    constructor(input: {
        readonly feature: Feature;
        readonly history?: DocumentEditLabels | null;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly transactionId?: TransactionId | null;
    }) {
        this.feature = input.feature;
        this.history = input.history ?? null;
        this.label = input.label ?? `Create ${input.feature.name}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
        this.transactionId = input.transactionId ?? null;
    }

    public execute(
        context: RequestContext<CadDocument>,
    ): RequestExecution<CadDocument, CreateFeaturePayloadRequestResult> {
        const transaction = new Transaction<CadDocument>({
            changeSet: createFeaturePayloadCreationChangeSet({
                document: context.document,
                feature: this.feature,
                label: this.label,
                partStudioId: this.partStudioId,
                payload: this.payload,
                payloadId: this.payloadId,
            }),
            id: this.transactionId ?? `create-feature-payload:${this.feature.id}`,
            label: this.label,
        });

        return createRequestExecution({
            history: this.history,
            result: {
                featureId: this.feature.id,
                partStudioId: this.partStudioId,
                payloadId: this.payloadId,
            },
            transaction,
        });
    }
}

export interface SetFeaturePayloadRequestResult extends CadDocumentRequestResult {
    readonly payloadId: FeaturePayloadId;
}

export class SetFeaturePayloadRequest implements Request<
    CadDocument,
    SetFeaturePayloadRequestResult
> {
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    private readonly history: DocumentEditLabels | null;
    private readonly transactionId: TransactionId | null;

    constructor(input: {
        readonly history?: DocumentEditLabels | null;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly transactionId?: TransactionId | null;
    }) {
        this.history = input.history ?? null;
        this.label = input.label ?? `Set feature payload: ${input.payloadId}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
        this.transactionId = input.transactionId ?? null;
    }

    public execute(
        context: RequestContext<CadDocument>,
    ): RequestExecution<CadDocument, SetFeaturePayloadRequestResult> {
        const transaction = new Transaction<CadDocument>({
            changeSet: createFeaturePayloadChangeSet({
                document: context.document,
                label: this.label,
                partStudioId: this.partStudioId,
                payload: this.payload,
                payloadId: this.payloadId,
            }),
            id: this.transactionId ?? `set-feature-payload:${this.payloadId}`,
            label: this.label,
        });

        return createRequestExecution({
            history: this.history,
            result: {
                partStudioId: this.partStudioId,
                payloadId: this.payloadId,
            },
            transaction,
        });
    }
}
