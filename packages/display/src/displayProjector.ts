import type {
    CadDocument,
    CadObject,
    DraftLineSegmentObject,
    EditDraft,
    PartStudio,
} from '@occt-draw/core';
import { createVector3 } from '@occt-draw/math';
import { createDisplayModel } from './displayModel';
import type { DisplayModel, DisplayObject, LineSegmentsDisplayObject } from './types';

export class DisplayProjector {
    projectDocument(document: CadDocument, draft: EditDraft | null = null): DisplayModel {
        return this.projectPartStudio(document.getActivePartStudio(), draft);
    }

    projectPartStudio(partStudio: PartStudio, draft: EditDraft | null = null): DisplayModel {
        return createDisplayModel(partStudio.id, partStudio.name, [
            ...partStudio.objects.map((object) => this.toDisplayObject(object)),
            ...this.projectDraftObjects(draft),
        ]);
    }

    toDisplayObject(object: CadObject): DisplayObject {
        if (object.kind === 'reference-grid') {
            return {
                id: object.id,
                kind: 'grid',
                name: object.name,
                visible: object.visible,
                divisions: object.divisions,
                size: object.size,
            };
        }

        if (object.kind === 'reference-axis') {
            return {
                id: object.id,
                kind: 'axis',
                name: object.name,
                visible: object.visible,
                length: object.length,
            };
        }

        return {
            id: object.id,
            kind: 'cube-wireframe',
            name: object.name,
            visible: object.visible,
            center: createVector3(object.center.x, object.center.y, object.center.z),
            size: object.size,
        };
    }

    private projectDraftObjects(draft: EditDraft | null): readonly DisplayObject[] {
        if (!draft) {
            return [];
        }

        const temporaryLineSegments = draft.temporaryObjects.filter(isDraftLineSegmentObject);

        if (temporaryLineSegments.length === 0) {
            return [];
        }

        return [
            {
                id: `${draft.id}:temporary-lines`,
                kind: 'line-segments',
                name: '临时线段',
                visible: true,
                color: createVector3(0.35, 0.72, 1),
                segments: temporaryLineSegments.map((object) => object.segment),
            } satisfies LineSegmentsDisplayObject,
        ];
    }
}

export function projectDocumentToDisplayModel(
    document: CadDocument,
    draft: EditDraft | null = null,
): DisplayModel {
    return new DisplayProjector().projectDocument(document, draft);
}

export function projectPartStudioToDisplayModel(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
): DisplayModel {
    return new DisplayProjector().projectPartStudio(partStudio, draft);
}

function isDraftLineSegmentObject(object: {
    readonly kind: string;
}): object is DraftLineSegmentObject {
    return object.kind === 'line-segment';
}
