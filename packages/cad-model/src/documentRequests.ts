import {
    createRequestExecution,
    Transaction,
    type HistoryLabels,
    type Request,
    type RequestContext,
    type RequestExecution,
    type TransactionId,
} from '@occt-draw/core';
import type { CadDocument, FeaturePayload } from './document';
import { AppendFeatureOperation, SetFeaturePayloadOperation } from './documentOperations';
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
    private readonly history: HistoryLabels | null;
    private readonly transactionId: TransactionId | null;

    constructor(input: {
        readonly feature: Feature;
        readonly history?: HistoryLabels | null;
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
        const partStudio = findPartStudioOrThrow(context.document, this.partStudioId);
        const transaction = new Transaction<CadDocument>({
            id: this.transactionId ?? `create-feature-payload:${this.feature.id}`,
            label: this.label,
            operations: [
                new AppendFeatureOperation({
                    feature: this.feature,
                    label: `Append ${this.feature.name}`,
                    partStudioId: this.partStudioId,
                }),
                new SetFeaturePayloadOperation({
                    label: `Set ${this.feature.name} payload`,
                    partStudioId: this.partStudioId,
                    payload: this.payload,
                    payloadId: this.payloadId,
                    previousPayload: partStudio.findFeaturePayload(this.payloadId),
                }),
            ],
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
    private readonly history: HistoryLabels | null;
    private readonly transactionId: TransactionId | null;

    constructor(input: {
        readonly history?: HistoryLabels | null;
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
        const partStudio = findPartStudioOrThrow(context.document, this.partStudioId);
        const transaction = new Transaction<CadDocument>({
            id: this.transactionId ?? `set-feature-payload:${this.payloadId}`,
            label: this.label,
            operations: [
                new SetFeaturePayloadOperation({
                    label: this.label,
                    partStudioId: this.partStudioId,
                    payload: this.payload,
                    payloadId: this.payloadId,
                    previousPayload: partStudio.findFeaturePayload(this.payloadId),
                }),
            ],
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

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId) {
    const partStudio = document.partStudioStore.find(partStudioId);

    if (!partStudio) {
        throw new Error(`Document request failed: PartStudio ${partStudioId} was not found.`);
    }

    return partStudio;
}
