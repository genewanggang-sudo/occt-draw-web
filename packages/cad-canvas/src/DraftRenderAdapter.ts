import type { CadDocument } from '@occt-draw/cad-model';
import type {
    DraftLineSegmentObject,
    DraftObject,
    DraftPointObject,
    EditDraft,
} from '@occt-draw/core';
import type { CanvasLineStyle, CanvasObject } from '@occt-draw/canvas';
import type { Vector3 } from '@occt-draw/math';
import { EDIT_PREVIEW_LAYER_ID } from './canvasAdapterLayers';
import { ON_SHAPE_SKETCH_PREVIEW_COLOR } from './sketchPointVisuals';

interface DraftLineGroup {
    readonly color: Vector3;
    readonly lineStyle: CanvasLineStyle;
    readonly objects: DraftLineSegmentObject[];
}

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
        const lineGroups = groupLineSegmentObjects(lineSegmentObjects);
        const linePoints = lineSegmentObjects
            .filter((object) => object.showEndpointPoints !== false)
            .flatMap((object) => [object.segment.start, object.segment.end]);
        const objects: CanvasObject[] = [];

        for (const group of lineGroups) {
            objects.push({
                color: group.color,
                depthRole: 'primary',
                id: `${draft.id}:temporary-lines:${group.lineStyle}:${toColorKey(group.color)}`,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: 'temporary lines',
                pickable: false,
                lineStyle: group.lineStyle,
                segments: group.objects.map((object) => object.segment),
                visible: true,
            });
        }

        if (linePoints.length > 0) {
            objects.push({
                color: ON_SHAPE_SKETCH_PREVIEW_COLOR,
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
                color: point.color ?? ON_SHAPE_SKETCH_PREVIEW_COLOR,
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

function groupLineSegmentObjects(
    objects: readonly DraftLineSegmentObject[],
): readonly DraftLineGroup[] {
    const groups = new Map<string, DraftLineGroup>();

    for (const object of objects) {
        const color = object.color ?? ON_SHAPE_SKETCH_PREVIEW_COLOR;
        const lineStyle = object.lineStyle ?? 'solid';
        const key = `${lineStyle}:${toColorKey(color)}`;
        const group = groups.get(key);

        if (group) {
            group.objects.push(object);
            continue;
        }

        groups.set(key, {
            color,
            lineStyle,
            objects: [object],
        });
    }

    return [...groups.values()];
}

function toColorKey(color: Vector3): string {
    return [color.x, color.y, color.z].map((component) => component.toFixed(4)).join(',');
}
