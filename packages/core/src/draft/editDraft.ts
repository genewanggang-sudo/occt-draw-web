import type { LineSegment3, Vector3 } from '@occt-draw/math';

export type DraftId = string;
export type DraftKind = 'generic' | 'selection' | 'temporary' | 'transform';
export type DraftObjectId = string;
export type DraftObjectKind = 'line-segment' | 'point';

export interface BaseDraftObject {
    readonly id: DraftObjectId;
    readonly kind: DraftObjectKind;
    readonly visible: boolean;
}

export interface DraftLineSegmentObject extends BaseDraftObject {
    readonly color?: Vector3;
    readonly kind: 'line-segment';
    readonly segment: LineSegment3;
}

export interface DraftPointObject extends BaseDraftObject {
    readonly color?: Vector3;
    readonly kind: 'point';
    readonly point: Vector3;
}

export type DraftObject = DraftLineSegmentObject | DraftPointObject;

export class EditDraft<TDocument = unknown> {
    public readonly id: DraftId;
    public readonly kind: DraftKind;
    public readonly metadata: ReadonlyMap<string, unknown>;
    public readonly temporaryObjects: readonly DraftObject[];
    public readonly workingDocument: TDocument | null;

    constructor(input: {
        readonly id: DraftId;
        readonly kind: DraftKind;
        readonly metadata?: ReadonlyMap<string, unknown>;
        readonly temporaryObjects?: readonly DraftObject[];
        readonly workingDocument?: TDocument | null;
    }) {
        this.id = input.id;
        this.kind = input.kind;
        this.metadata = new Map(input.metadata ?? []);
        this.temporaryObjects = [...(input.temporaryObjects ?? [])];
        this.workingDocument = input.workingDocument ?? null;
    }

    public withTemporaryObjects(temporaryObjects: readonly DraftObject[]): EditDraft<TDocument> {
        return new EditDraft({
            id: this.id,
            kind: this.kind,
            metadata: this.metadata,
            temporaryObjects,
            workingDocument: this.workingDocument,
        });
    }

    public withWorkingDocument(workingDocument: TDocument | null): EditDraft<TDocument> {
        return new EditDraft({
            id: this.id,
            kind: this.kind,
            metadata: this.metadata,
            temporaryObjects: this.temporaryObjects,
            workingDocument,
        });
    }

    public withMetadata(key: string, value: unknown): EditDraft<TDocument> {
        const metadata = new Map(this.metadata);

        metadata.set(key, value);

        return new EditDraft({
            id: this.id,
            kind: this.kind,
            metadata,
            temporaryObjects: this.temporaryObjects,
            workingDocument: this.workingDocument,
        });
    }
}

export function createEditDraft<TDocument = unknown>(input: {
    readonly id: DraftId;
    readonly kind: DraftKind;
}): EditDraft<TDocument> {
    return new EditDraft<TDocument>(input);
}
