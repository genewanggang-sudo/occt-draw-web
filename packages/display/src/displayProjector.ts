import type {
    CadDocument,
    CadObject,
    DraftLineSegmentObject,
    EditDraft,
    PartStudio,
    ReferencePlaneObject,
} from '@occt-draw/core';
import {
    addVector3,
    createLineSegment3,
    createVector3,
    crossVector3,
    normalizeVector3,
    scaleVector3,
    type Vector3,
} from '@occt-draw/math';
import {
    findSketchPointById,
    listSketchLines,
    listSketchPoints,
    sketchPointToWorld,
    type Sketch,
    type SketchId,
} from '@occt-draw/sketch';
import { createDisplayModel } from './displayModel';
import type {
    DisplayModel,
    DisplayObject,
    LineBatchDisplayObject,
    PointBatchDisplayObject,
    SurfaceBatchDisplayObject,
} from './types';

export interface DisplayProjectionContext {
    readonly sketchesById?: Readonly<Record<SketchId, Sketch>>;
}

const EMPTY_DISPLAY_PROJECTION_CONTEXT: DisplayProjectionContext = {
    sketchesById: {},
};

export class DisplayProjector {
    public projectDocument(
        document: CadDocument,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): DisplayModel {
        return this.projectPartStudio(document.getActivePartStudio(), draft, context);
    }

    public projectPartStudio(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): DisplayModel {
        return createDisplayModel(partStudio.id, partStudio.name, [
            ...partStudio.objects.flatMap((object) => this.toDisplayObjects(object)),
            ...this.projectSketchFeatures(partStudio, context),
            ...this.projectDraftObjects(draft),
        ]);
    }

    public toDisplayObject(object: CadObject): DisplayObject {
        return this.toDisplayObjects(object)[0] ?? createHiddenLineBatch(object);
    }

    public toDisplayObjects(object: CadObject): readonly DisplayObject[] {
        if (object.kind === 'reference-grid') {
            return [
                {
                    id: object.id,
                    kind: 'grid',
                    name: object.name,
                    visible: object.visible,
                    divisions: object.divisions,
                    size: object.size,
                },
            ];
        }

        if (object.kind === 'reference-axis') {
            return [
                {
                    id: object.id,
                    kind: 'axis',
                    name: object.name,
                    visible: object.visible,
                    length: object.length,
                },
            ];
        }

        if (object.kind === 'reference-plane') {
            return projectReferencePlaneObject(object);
        }

        return [
            {
                id: object.id,
                kind: 'cube-wireframe',
                name: object.name,
                visible: object.visible,
                center: createVector3(object.center.x, object.center.y, object.center.z),
                size: object.size,
            },
        ];
    }

    private projectSketchFeatures(
        partStudio: PartStudio,
        context: DisplayProjectionContext,
    ): readonly DisplayObject[] {
        return partStudio.features.flatMap((feature) => {
            if (feature.type !== 'sketch' || !feature.payloadRef) {
                return [];
            }

            const sketch = context.sketchesById?.[feature.payloadRef];

            if (!sketch) {
                return [];
            }

            const objects: DisplayObject[] = [];
            const segments = listSketchLines(sketch).flatMap((line) => {
                const startPoint = findSketchPointById(sketch, line.startPointId);
                const endPoint = findSketchPointById(sketch, line.endPointId);

                if (!startPoint || !endPoint) {
                    return [];
                }

                return [
                    createLineSegment3(
                        sketchPointToWorld(sketch, startPoint),
                        sketchPointToWorld(sketch, endPoint),
                    ),
                ];
            });
            const points = listSketchPoints(sketch).map((point) =>
                sketchPointToWorld(sketch, point),
            );

            if (segments.length > 0) {
                objects.push({
                    id: feature.id,
                    kind: 'line-batch',
                    name: feature.name,
                    visible: !feature.suppressed,
                    color: createVector3(0.05, 0.38, 0.85),
                    segments,
                } satisfies LineBatchDisplayObject);
            }

            if (points.length > 0) {
                objects.push({
                    id: `${feature.id}:points`,
                    kind: 'point-batch',
                    name: `${feature.name} 端点`,
                    visible: !feature.suppressed,
                    color: createVector3(0.05, 0.38, 0.85),
                    points,
                    sizePixels: 7,
                } satisfies PointBatchDisplayObject);
            }

            return objects;
        });
    }

    private projectDraftObjects(draft: EditDraft | null): readonly DisplayObject[] {
        if (!draft) {
            return [];
        }

        const temporaryLineSegments = draft.temporaryObjects.filter(isDraftLineSegmentObject);

        if (temporaryLineSegments.length === 0) {
            return [];
        }

        const segments = temporaryLineSegments.map((object) => object.segment);

        return [
            {
                id: `${draft.id}:temporary-lines`,
                kind: 'line-batch',
                name: '临时线段',
                visible: true,
                color: createVector3(0.35, 0.72, 1),
                segments,
            } satisfies LineBatchDisplayObject,
            {
                id: `${draft.id}:temporary-points`,
                kind: 'point-batch',
                name: '临时端点',
                visible: true,
                color: createVector3(0.35, 0.72, 1),
                points: segments.flatMap((segment) => [segment.start, segment.end]),
                sizePixels: 7,
            } satisfies PointBatchDisplayObject,
        ];
    }
}

export function projectDocumentToDisplayModel(
    document: CadDocument,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): DisplayModel {
    return new DisplayProjector().projectDocument(document, draft, context);
}

export function projectPartStudioToDisplayModel(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): DisplayModel {
    return new DisplayProjector().projectPartStudio(partStudio, draft, context);
}

function projectReferencePlaneObject(object: ReferencePlaneObject): readonly DisplayObject[] {
    const halfSize = object.size / 2;
    const xAxis = normalizeVector3(object.xAxis);
    const yAxis = normalizeVector3(crossVector3(object.normal, xAxis));
    const left = scaleVector3(xAxis, -halfSize);
    const right = scaleVector3(xAxis, halfSize);
    const bottom = scaleVector3(yAxis, -halfSize);
    const top = scaleVector3(yAxis, halfSize);
    const corners = [
        addMany(object.origin, left, bottom),
        addMany(object.origin, right, bottom),
        addMany(object.origin, right, top),
        addMany(object.origin, left, top),
    ] as const;

    return [
        {
            id: `${object.id}:surface`,
            kind: 'surface-batch',
            name: `${object.name} 面`,
            visible: object.visible,
            color: createVector3(0.12, 0.42, 0.8),
            opacity: 0.18,
            triangles: [
                { a: corners[0], b: corners[1], c: corners[2] },
                { a: corners[0], b: corners[2], c: corners[3] },
            ],
        } satisfies SurfaceBatchDisplayObject,
        {
            id: object.id,
            kind: 'line-batch',
            name: object.name,
            visible: object.visible,
            color: createVector3(0.22, 0.5, 0.9),
            segments: [
                createLineSegment3(corners[0], corners[1]),
                createLineSegment3(corners[1], corners[2]),
                createLineSegment3(corners[2], corners[3]),
                createLineSegment3(corners[3], corners[0]),
                createLineSegment3(addMany(object.origin, left), addMany(object.origin, right)),
                createLineSegment3(addMany(object.origin, bottom), addMany(object.origin, top)),
            ],
        } satisfies LineBatchDisplayObject,
    ];
}

function addMany(origin: Vector3, ...vectors: readonly Vector3[]): Vector3 {
    return vectors.reduce((current, vector) => addVector3(current, vector), origin);
}

function createHiddenLineBatch(object: CadObject): LineBatchDisplayObject {
    return {
        id: object.id,
        kind: 'line-batch',
        name: object.name,
        visible: false,
        color: createVector3(0, 0, 0),
        segments: [],
    };
}

function isDraftLineSegmentObject(object: {
    readonly kind: string;
}): object is DraftLineSegmentObject {
    return object.kind === 'line-segment';
}
