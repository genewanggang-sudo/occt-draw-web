import { type Operation, type OperationId, createOperationId } from '@occt-draw/core';
import { CadDocument, type FeaturePayload, type PartStudio } from './document';
import type { Feature } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export class AppendFeatureOperation implements Operation<CadDocument> {
    public readonly feature: Feature;
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;

    constructor(input: {
        readonly feature: Feature;
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
    }) {
        this.feature = input.feature;
        this.id = input.id ?? createOperationId('append-feature', input.feature.id);
        this.label = input.label ?? `Append feature: ${input.feature.name}`;
        this.partStudioId = input.partStudioId;
    }

    public apply(document: CadDocument): CadDocument {
        return replacePartStudio(
            document,
            findPartStudioOrThrow(document, this.partStudioId).appendFeature(this.feature),
        );
    }

    public revert(document: CadDocument): CadDocument {
        return replacePartStudio(
            document,
            findPartStudioOrThrow(document, this.partStudioId).removeFeature(this.feature.id),
        );
    }
}

export class ReplaceActivePartStudioOperation implements Operation<CadDocument> {
    public readonly activePartStudioId: PartStudioId;
    public readonly id: OperationId;
    public readonly label: string;
    public readonly previousActivePartStudioId: PartStudioId;

    constructor(input: {
        readonly activePartStudioId: PartStudioId;
        readonly id?: OperationId;
        readonly label?: string;
        readonly previousActivePartStudioId: PartStudioId;
    }) {
        this.activePartStudioId = input.activePartStudioId;
        this.id =
            input.id ?? createOperationId('replace-active-part-studio', input.activePartStudioId);
        this.label = input.label ?? 'Replace active part studio';
        this.previousActivePartStudioId = input.previousActivePartStudioId;
    }

    public apply(document: CadDocument): CadDocument {
        return new CadDocument({
            activePartStudioId: this.activePartStudioId,
            id: document.id,
            metadata: document.metadata,
            name: document.name,
            partStudios: document.partStudios,
            revision: document.revision,
        });
    }

    public revert(document: CadDocument): CadDocument {
        return new CadDocument({
            activePartStudioId: this.previousActivePartStudioId,
            id: document.id,
            metadata: document.metadata,
            name: document.name,
            partStudios: document.partStudios,
            revision: document.revision,
        });
    }
}

export class ReplacePartStudioOperation implements Operation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudio: PartStudio;
    public readonly previousPartStudio: PartStudio;

    constructor(input: {
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudio: PartStudio;
        readonly previousPartStudio: PartStudio;
    }) {
        this.id = input.id ?? createOperationId('replace-part-studio', input.partStudio.id);
        this.label = input.label ?? `Replace part studio: ${input.partStudio.name}`;
        this.partStudio = input.partStudio;
        this.previousPartStudio = input.previousPartStudio;
    }

    public apply(document: CadDocument): CadDocument {
        return replacePartStudio(document, this.partStudio);
    }

    public revert(document: CadDocument): CadDocument {
        return replacePartStudio(document, this.previousPartStudio);
    }
}

export class SetFeaturePayloadOperation implements Operation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    public readonly previousPayload: FeaturePayload | null;

    constructor(input: {
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
        readonly payload: FeaturePayload;
        readonly payloadId: FeaturePayloadId;
        readonly previousPayload: FeaturePayload | null;
    }) {
        this.id = input.id ?? createOperationId('set-feature-payload', input.payloadId);
        this.label = input.label ?? `Set feature payload: ${input.payloadId}`;
        this.partStudioId = input.partStudioId;
        this.payload = input.payload;
        this.payloadId = input.payloadId;
        this.previousPayload = input.previousPayload;
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

    public revert(document: CadDocument): CadDocument {
        const partStudio = findPartStudioOrThrow(document, this.partStudioId);

        return replacePartStudio(
            document,
            this.previousPayload
                ? partStudio.setFeaturePayload(this.payloadId, this.previousPayload)
                : partStudio.removeFeaturePayload(this.payloadId),
        );
    }
}

function replacePartStudio(document: CadDocument, partStudio: PartStudio): CadDocument {
    return new CadDocument({
        activePartStudioId: document.activePartStudioId,
        id: document.id,
        metadata: document.metadata,
        name: document.name,
        partStudios: document.partStudios.map((current) =>
            current.id === partStudio.id ? partStudio : current,
        ),
        revision: document.revision,
    });
}

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId): PartStudio {
    const partStudio = document.partStudios.find((current) => current.id === partStudioId);

    if (!partStudio) {
        throw new Error(`Document edit failed: PartStudio ${partStudioId} was not found.`);
    }

    return partStudio;
}
