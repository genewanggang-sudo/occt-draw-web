import type { LineSegment3, Point3, Vector3 } from '@occt-draw/math';
import type { CadDocument } from './document';

export type DraftId = string;
export type DraftKind = 'generic' | 'selection' | 'sketch' | 'transform';
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
    readonly point: Point3;
}

export type DraftObject = DraftLineSegmentObject | DraftPointObject;

export class EditDraft {
    readonly id: DraftId;
    readonly kind: DraftKind;
    readonly metadata: ReadonlyMap<string, unknown>;
    readonly temporaryObjects: readonly DraftObject[];
    readonly workingDocument: CadDocument | null;

    constructor(input: {
        readonly id: DraftId;
        readonly kind: DraftKind;
        readonly metadata?: ReadonlyMap<string, unknown>;
        readonly temporaryObjects?: readonly DraftObject[];
        readonly workingDocument?: CadDocument | null;
    }) {
        this.id = input.id;
        this.kind = input.kind;
        this.metadata = new Map(input.metadata ?? []);
        this.temporaryObjects = [...(input.temporaryObjects ?? [])];
        this.workingDocument = input.workingDocument ?? null;
    }

    withTemporaryObjects(temporaryObjects: readonly DraftObject[]): EditDraft {
        return new EditDraft({
            id: this.id,
            kind: this.kind,
            metadata: this.metadata,
            temporaryObjects,
            workingDocument: this.workingDocument,
        });
    }

    withWorkingDocument(workingDocument: CadDocument | null): EditDraft {
        return new EditDraft({
            id: this.id,
            kind: this.kind,
            metadata: this.metadata,
            temporaryObjects: this.temporaryObjects,
            workingDocument,
        });
    }

    withMetadata(key: string, value: unknown): EditDraft {
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

export function createEditDraft(input: {
    readonly id: DraftId;
    readonly kind: DraftKind;
}): EditDraft {
    return new EditDraft(input);
}
