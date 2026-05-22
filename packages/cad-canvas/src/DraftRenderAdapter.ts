import type { CadDocument } from '@occt-draw/cad-model';
import type {
    DraftLineSegmentObject,
    DraftObject,
    DraftPointObject,
    EditDraft,
} from '@occt-draw/core';
import type { CanvasObject } from '@occt-draw/canvas';
import { Vec3 } from '@occt-draw/math';
import { EDIT_PREVIEW_LAYER_ID } from './canvasAdapterLayers';

export class DraftRenderAdapter {
    public createDraftObjects(draft: EditDraft<CadDocument> | null): readonly CanvasObject[] {
        if (!draft) {
            return [];
        }

        const lineSegmentObjects = draft.temporaryObjects.filter((object) =>
            this.isDraftLineSegmentObject(object),
        );
        const pointObjects = draft.temporaryObjects.filter((object) =>
            this.isDraftPointObject(object),
        );
        const segments = lineSegmentObjects.map((object) => object.segment);
        const linePoints = segments.flatMap((segment) => [segment.start, segment.end]);
        const objects: CanvasObject[] = [];

        if (segments.length > 0) {
            objects.push({
                color: Vec3.of(0.35, 0.72, 1),
                depthRole: 'primary',
                id: `${draft.id}:temporary-lines`,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: 'temporary lines',
                pickable: false,
                segments,
                visible: true,
            });
        }

        if (linePoints.length > 0) {
            objects.push({
                color: Vec3.of(0.35, 0.72, 1),
                depthRole: 'primary',
                id: `${draft.id}:temporary-line-points`,
                kind: 'point',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: 'temporary line points',
                pickable: false,
                points: linePoints,
                sizePixels: 7,
                visible: true,
            });
        }

        for (const [index, point] of pointObjects.entries()) {
            objects.push({
                color: point.color ?? Vec3.of(0.35, 0.72, 1),
                depthRole: 'primary',
                id: `${draft.id}:temporary-point:${String(index)}`,
                kind: 'point',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: 'temporary point',
                pickable: false,
                points: [point.point],
                sizePixels: 10,
                visible: point.visible,
            });
        }

        return objects;
    }

    private isDraftLineSegmentObject(object: DraftObject): object is DraftLineSegmentObject {
        return object.kind === 'line-segment';
    }

    private isDraftPointObject(object: DraftObject): object is DraftPointObject {
        return object.kind === 'point';
    }
}
