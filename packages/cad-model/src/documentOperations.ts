import {
    type ModelElement,
    type Operation,
    type OperationId,
    createOperationId,
    setNextModelRevision,
} from '@occt-draw/core';
import type { CadDocument, FeaturePayload, PartStudio } from './document';
import type { Feature } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export class AppendFeatureOperation implements Operation<CadDocument> {
    public readonly feature: Feature;
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    private previousPartStudio: PartStudio | null = null;

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
        this.previousPartStudio = findPartStudioOrThrow(document, this.partStudioId);

        return withPartStudio(document, this.previousPartStudio.appendFeature(this.feature));
    }

    public revert(document: CadDocument): CadDocument {
        return this.previousPartStudio
            ? withPartStudio(document, this.previousPartStudio)
            : document;
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
        return document.withActivePartStudioId(this.activePartStudioId);
    }

    public revert(document: CadDocument): CadDocument {
        return document.withActivePartStudioId(this.previousActivePartStudioId);
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
        return withPartStudio(
            document,
            setNextModelRevision(this.partStudio, this.previousPartStudio.revision),
        );
    }

    public revert(document: CadDocument): CadDocument {
        return withPartStudio(document, this.previousPartStudio);
    }
}

export class SetFeaturePayloadOperation implements Operation<CadDocument> {
    public readonly id: OperationId;
    public readonly label: string;
    public readonly partStudioId: PartStudioId;
    public readonly payload: FeaturePayload;
    public readonly payloadId: FeaturePayloadId;
    public readonly previousPayload: FeaturePayload | null;
    private previousPartStudio: PartStudio | null = null;

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
        this.previousPartStudio = findPartStudioOrThrow(document, this.partStudioId);

        return withPartStudio(
            document,
            this.previousPartStudio.setFeaturePayload(
                this.payloadId,
                nextPayloadRevision(this.payload, this.previousPayload),
            ),
        );
    }

    public revert(document: CadDocument): CadDocument {
        return this.previousPartStudio
            ? withPartStudio(document, this.previousPartStudio)
            : document;
    }
}

function withPartStudio(document: CadDocument, partStudio: PartStudio): CadDocument {
    return document.withPartStudioStore(document.partStudioStore.set(partStudio));
}

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId): PartStudio {
    const partStudio = document.partStudioStore.find(partStudioId);

    if (!partStudio) {
        throw new Error(`Document edit failed: PartStudio ${partStudioId} was not found.`);
    }

    return partStudio;
}

function nextPayloadRevision(
    payload: FeaturePayload,
    previousPayload: FeaturePayload | null,
): FeaturePayload {
    if (isModelElement(payload) && isModelElement(previousPayload)) {
        return setNextModelRevision(payload, previousPayload.revision);
    }

    return payload;
}

function isModelElement(payload: FeaturePayload | null): payload is FeaturePayload & ModelElement {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'nextRevision' in payload &&
        typeof payload.nextRevision === 'function' &&
        'withRevision' in payload &&
        typeof payload.withRevision === 'function'
    );
}
