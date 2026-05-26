import {
    ModelChangeSetBuilder,
    createModelChangeId,
    type ModelElementChangeTarget,
    type ModelChangeSet,
    type ModelPropertyChangeTarget,
    type ModelRef,
} from '@occt-draw/core';
import type { CadDocument, FeaturePayload, PartStudio } from './document';
import type { Feature, FeaturePayloadRef } from './features';
import type { FeaturePayloadId, PartStudioId } from './ids';

export type PartStudioFeatureChangeRef = ModelRef & {
    readonly partStudioId: PartStudioId;
};

export type FeaturePayloadChangeRef = FeaturePayloadRef & {
    readonly partStudioId: PartStudioId;
};

export function createFeaturePayloadCreationChangeSet(input: {
    readonly document: CadDocument;
    readonly feature: Feature;
    readonly label: string;
    readonly partStudioId: PartStudioId;
    readonly payload: FeaturePayload;
    readonly payloadId: FeaturePayloadId;
}): ModelChangeSet<CadDocument> {
    const partStudio = findPartStudioOrThrow(input.document, input.partStudioId);
    const builder = new ModelChangeSetBuilder<CadDocument>();
    const previousPayload = partStudio.findFeaturePayload(input.payloadId);

    builder.recordAdd({
        id: createModelChangeId('cad-add-feature', input.feature.id),
        label: `Append ${input.feature.name}`,
        ref: createPartStudioFeatureRef(input.partStudioId, input.feature),
        target: partStudioFeatureTarget,
        value: input.feature,
    });
    recordFeaturePayloadChange({
        after: input.payload,
        before: previousPayload,
        builder,
        label: `Set ${input.feature.name} payload`,
        partStudioId: input.partStudioId,
        payloadId: input.payloadId,
    });

    return builder.toChangeSet();
}

export function createFeaturePayloadChangeSet(input: {
    readonly document: CadDocument;
    readonly label: string;
    readonly partStudioId: PartStudioId;
    readonly payload: FeaturePayload;
    readonly payloadId: FeaturePayloadId;
}): ModelChangeSet<CadDocument> {
    const partStudio = findPartStudioOrThrow(input.document, input.partStudioId);
    const builder = new ModelChangeSetBuilder<CadDocument>();

    recordFeaturePayloadChange({
        after: input.payload,
        before: partStudio.findFeaturePayload(input.payloadId),
        builder,
        label: input.label,
        partStudioId: input.partStudioId,
        payloadId: input.payloadId,
    });

    return builder.toChangeSet();
}

export function findPartStudioOrThrow(
    document: CadDocument,
    partStudioId: PartStudioId,
): PartStudio {
    const partStudio = document.partStudioStore.find(partStudioId);

    if (!partStudio) {
        throw new Error(`Document change failed: PartStudio ${partStudioId} was not found.`);
    }

    return partStudio;
}

export function withPartStudio(document: CadDocument, partStudio: PartStudio): CadDocument {
    return document.withPartStudioStore(document.partStudioStore.set(partStudio));
}

function recordFeaturePayloadChange(input: {
    readonly after: FeaturePayload;
    readonly before: FeaturePayload | null;
    readonly builder: ModelChangeSetBuilder<CadDocument>;
    readonly label: string;
    readonly partStudioId: PartStudioId;
    readonly payloadId: FeaturePayloadId;
}): void {
    const ref = createFeaturePayloadChangeRef(input.partStudioId, input.payloadId);

    if (input.before === null) {
        input.builder.recordAdd({
            id: createModelChangeId('cad-add-feature-payload', input.payloadId),
            label: input.label,
            ref,
            target: featurePayloadTarget,
            value: input.after,
        });
        return;
    }

    input.builder.recordUpdate({
        after: input.after,
        before: input.before,
        id: createModelChangeId('cad-set-feature-payload', input.payloadId),
        label: input.label,
        propertyPath: ['payload'],
        ref,
        target: featurePayloadValueTarget,
    });
}

function createPartStudioFeatureRef(
    partStudioId: PartStudioId,
    feature: Feature,
): PartStudioFeatureChangeRef {
    return {
        ...feature.toRef(),
        partStudioId,
    };
}

function createFeaturePayloadChangeRef(
    partStudioId: PartStudioId,
    payloadId: FeaturePayloadId,
): FeaturePayloadChangeRef {
    return {
        id: payloadId,
        kind: 'cad.feature-payload',
        ownerId: partStudioId,
        partStudioId,
    };
}

const partStudioFeatureTarget: ModelElementChangeTarget<
    CadDocument,
    PartStudioFeatureChangeRef,
    Feature
> = {
    targetKind: 'cad.part-studio.feature',
    add: (document, ref, feature) =>
        withPartStudio(
            document,
            findPartStudioOrThrow(document, ref.partStudioId).appendFeature(feature),
        ),
    remove: (document, ref) =>
        withPartStudio(
            document,
            findPartStudioOrThrow(document, ref.partStudioId).removeFeature(ref.id),
        ),
};

const featurePayloadTarget: ModelElementChangeTarget<
    CadDocument,
    FeaturePayloadChangeRef,
    FeaturePayload
> = {
    targetKind: 'cad.feature-payload',
    add: (document, ref, payload) =>
        withPartStudio(
            document,
            findPartStudioOrThrow(document, ref.partStudioId).setFeaturePayload(ref.id, payload),
        ),
    remove: (document, ref) =>
        withPartStudio(
            document,
            findPartStudioOrThrow(document, ref.partStudioId).removeFeaturePayload(ref.id),
        ),
};

const featurePayloadValueTarget: ModelPropertyChangeTarget<
    CadDocument,
    FeaturePayloadChangeRef,
    FeaturePayload
> = {
    targetKind: 'cad.feature-payload',
    set: (document, ref, _propertyPath, payload) =>
        withPartStudio(
            document,
            findPartStudioOrThrow(document, ref.partStudioId).setFeaturePayload(ref.id, payload),
        ),
};
