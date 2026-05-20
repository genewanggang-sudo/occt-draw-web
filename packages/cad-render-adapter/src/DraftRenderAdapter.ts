import type { CadDocument } from '@occt-draw/cad-model';
import type {
    DraftLineSegmentObject,
    DraftObject,
    DraftPointObject,
    EditDraft,
} from '@occt-draw/core';
import type { CadRenderDraft } from '@occt-draw/cad-rendering';

export class DraftRenderAdapter {
    public createDraft(draft: EditDraft<CadDocument> | null): CadRenderDraft | null {
        if (!draft) {
            return null;
        }

        return {
            id: draft.id,
            temporaryLineSegments: draft.temporaryObjects
                .filter((object) => this.isDraftLineSegmentObject(object))
                .map((object) => {
                    return {
                        id: object.id,
                        segment: object.segment,
                        visible: object.visible,
                        ...(object.color ? { color: object.color } : {}),
                    };
                }),
            temporaryPoints: draft.temporaryObjects
                .filter((object) => this.isDraftPointObject(object))
                .map((object) => {
                    return {
                        id: object.id,
                        point: object.point,
                        visible: object.visible,
                        ...(object.color ? { color: object.color } : {}),
                    };
                }),
        };
    }

    private isDraftLineSegmentObject(object: DraftObject): object is DraftLineSegmentObject {
        return object.kind === 'line-segment';
    }

    private isDraftPointObject(object: DraftObject): object is DraftPointObject {
        return object.kind === 'point';
    }
}
