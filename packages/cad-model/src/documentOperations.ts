import { DocumentOperation, type OperationId, createOperationId } from '@occt-draw/core';
import { CadDocument, type FeaturePayload, type PartStudio } from './document';
import type { Feature } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export class AppendFeatureOperation extends DocumentOperation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly feature: Feature;
    public readonly partStudioId: PartStudioId;

    constructor(input: {
        readonly feature: Feature;
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
    }) {
        super();
        this.id = input.id ?? createOperationId('append-feature', input.feature.id);
        this.label = input.label ?? `追加特征：${input.feature.name}`;
        this.feature = input.feature;
        this.partStudioId = input.partStudioId;
    }

    public apply(document: CadDocument): CadDocument {
        return replacePartStudio(
            document,
            appendFeatureToPartStudio(
                findPartStudioOrThrow(document, this.partStudioId),
                this.feature,
            ),
        );
    }
}

export class ReplaceActivePartStudioOperation extends DocumentOperation<CadDocument> {
    public readonly activePartStudioId: PartStudioId;
    public readonly id: OperationId;
    public readonly label: string;

    constructor(input: {
        readonly activePartStudioId: PartStudioId;
        readonly id?: OperationId;
        readonly label?: string;
    }) {
        super();
        this.activePartStudioId = input.activePartStudioId;
        this.id =
            input.id ?? createOperationId('replace-active-part-studio', input.activePartStudioId);
        this.label = input.label ?? '切换零件工作室';
    }

    public apply(document: CadDocument): CadDocument {
        return new CadDocument({
            activePartStudioId: this.activePartStudioId,
            id: document.id,
            name: document.name,
            partStudios: document.partStudios,
        });
    }
}

export class ReplacePartStudioOperation extends DocumentOperation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudio: PartStudio;

    constructor(input: {
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudio: PartStudio;
    }) {
        super();
        this.id = input.id ?? createOperationId('replace-part-studio', input.partStudio.id);
        this.label = input.label ?? `替换零件工作室：${input.partStudio.name}`;
        this.partStudio = input.partStudio;
    }

    public apply(document: CadDocument): CadDocument {
        return replacePartStudio(document, this.partStudio);
    }
}

export class SetFeaturePayloadOperation extends DocumentOperation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;

    constructor(input: {
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
    }) {
        super();
        this.id = input.id ?? createOperationId('set-feature-payload', input.payloadId);
        this.label = input.label ?? `更新特征数据：${input.payloadId}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
    }

    public apply(document: CadDocument): CadDocument {
        return replacePartStudio(
            document,
            findPartStudioOrThrow(document, this.partStudioId).setFeaturePayload(
                this.payloadId,
                this.payload,
            ),
        );
    }
}

function appendFeatureToPartStudio(partStudio: PartStudio, feature: Feature): PartStudio {
    return partStudio.appendFeature(feature);
}

function replacePartStudio(document: CadDocument, partStudio: PartStudio): CadDocument {
    return new CadDocument({
        activePartStudioId: document.activePartStudioId,
        id: document.id,
        name: document.name,
        partStudios: document.partStudios.map((current) =>
            current.id === partStudio.id ? partStudio : current,
        ),
    });
}

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId): PartStudio {
    const partStudio = document.partStudios.find((current) => current.id === partStudioId);

    if (!partStudio) {
        throw new Error(`文档编辑失败：找不到 PartStudio ${partStudioId}`);
    }

    return partStudio;
}
