import {
    referencePlaneToPlane,
    type CadDocument,
    type CadObject,
    type DraftLineSegmentObject,
    type EditDraft,
    type PartStudio,
    type ReferenceOriginObject,
    type ReferencePlaneObject,
} from '@occt-draw/core';
import {
    addVector3,
    createLineSegment3,
    createVector3,
    scaleVector3,
    type Vector3,
} from '@occt-draw/math';
import {
    findSketchPointById,
    listSketchLines,
    listSketchPoints,
    sketchPointToWorldOnPlane,
    type Sketch,
    type SketchId,
} from '@occt-draw/sketch';
import { createRenderScene } from '@occt-draw/webgl-engine';
import type {
    RenderScene,
    RenderNode,
    LabelBatchRenderNode,
    LabelText,
    LineBatchRenderNode,
    MarkerBatchRenderNode,
    PointBatchRenderNode,
    SurfaceBatchRenderNode,
} from '@occt-draw/webgl-engine';

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
    ): RenderScene {
        return this.projectPartStudio(document.getActivePartStudio(), draft, context);
    }

    public projectPartStudio(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderScene {
        return createRenderScene(partStudio.id, partStudio.name, [
            ...partStudio.objects.flatMap((object) => this.toRenderNodes(object)),
            ...this.projectSketchFeatures(partStudio, context),
            ...this.projectDraftObjects(draft),
        ]);
    }

    public toRenderNode(object: CadObject): RenderNode {
        const [renderNode] = this.toRenderNodes(object);

        if (!renderNode) {
            throw new Error(`对象投影失败：${object.id}`);
        }

        return renderNode;
    }

    public toRenderNodes(object: CadObject): readonly RenderNode[] {
        if (object.kind === 'reference-origin') {
            return [projectReferenceOriginObject(object)];
        }

        return projectReferencePlaneObject(object);
    }

    private projectSketchFeatures(
        partStudio: PartStudio,
        context: DisplayProjectionContext,
    ): readonly RenderNode[] {
        return partStudio.features.flatMap((feature) => {
            if (feature.type !== 'sketch' || !feature.payloadRef) {
                return [];
            }

            const sketch = context.sketchesById?.[feature.payloadRef];

            if (!sketch) {
                return [];
            }

            const sketchPlane = findReferencePlaneById(partStudio, sketch.planeRef);

            if (!sketchPlane) {
                return [];
            }

            const plane = referencePlaneToPlane(sketchPlane);
            const objects: RenderNode[] = [];
            const segments = listSketchLines(sketch).flatMap((line) => {
                const startPoint = findSketchPointById(sketch, line.startPointId);
                const endPoint = findSketchPointById(sketch, line.endPointId);

                if (!startPoint || !endPoint) {
                    return [];
                }

                return [
                    createLineSegment3(
                        sketchPointToWorldOnPlane(plane, startPoint),
                        sketchPointToWorldOnPlane(plane, endPoint),
                    ),
                ];
            });
            const points = listSketchPoints(sketch).map((point) =>
                sketchPointToWorldOnPlane(plane, point),
            );

            if (segments.length > 0) {
                objects.push({
                    id: feature.id,
                    kind: 'line-batch',
                    name: feature.name,
                    depthRole: 'primary',
                    visible: !feature.suppressed,
                    color: createVector3(0.05, 0.38, 0.85),
                    segments,
                } satisfies LineBatchRenderNode);
            }

            if (points.length > 0) {
                objects.push({
                    id: `${feature.id}:points`,
                    kind: 'point-batch',
                    name: `${feature.name} 端点`,
                    depthRole: 'primary',
                    visible: !feature.suppressed,
                    color: createVector3(0.05, 0.38, 0.85),
                    points,
                    sizePixels: 7,
                } satisfies PointBatchRenderNode);
            }

            return objects;
        });
    }

    private projectDraftObjects(draft: EditDraft | null): readonly RenderNode[] {
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
                depthRole: 'primary',
                visible: true,
                color: createVector3(0.35, 0.72, 1),
                segments,
            } satisfies LineBatchRenderNode,
            {
                id: `${draft.id}:temporary-points`,
                kind: 'point-batch',
                name: '临时端点',
                depthRole: 'primary',
                visible: true,
                color: createVector3(0.35, 0.72, 1),
                points: segments.flatMap((segment) => [segment.start, segment.end]),
                sizePixels: 7,
            } satisfies PointBatchRenderNode,
        ];
    }
}

export function projectDocumentToRenderScene(
    document: CadDocument,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderScene {
    return new DisplayProjector().projectDocument(document, draft, context);
}

export function projectPartStudioToRenderScene(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderScene {
    return new DisplayProjector().projectPartStudio(partStudio, draft, context);
}

function projectReferenceOriginObject(object: ReferenceOriginObject): MarkerBatchRenderNode {
    return {
        id: object.id,
        kind: 'marker-batch',
        name: object.name,
        depthRole: 'primary',
        visible: object.visible,
        markers: [
            {
                color: createVector3(0.78, 0.8, 0.82),
                position: object.position,
                shape: 'origin',
                sizePixels: 13,
            },
        ],
    };
}

function projectReferencePlaneObject(object: ReferencePlaneObject): readonly RenderNode[] {
    const plane = referencePlaneToPlane(object);
    const halfSize = object.size / 2;
    const labelYAxis = scaleVector3(plane.yAxis, -1);
    const left = scaleVector3(plane.xAxis, -halfSize);
    const right = scaleVector3(plane.xAxis, halfSize);
    const bottom = scaleVector3(plane.yAxis, -halfSize);
    const top = scaleVector3(plane.yAxis, halfSize);
    const corners = [
        addMany(plane.origin, left, bottom),
        addMany(plane.origin, right, bottom),
        addMany(plane.origin, right, top),
        addMany(plane.origin, left, top),
    ] as const;
    const labelFrameOrigin = addMany(
        plane.origin,
        scaleVector3(plane.xAxis, -halfSize),
        scaleVector3(plane.yAxis, halfSize),
    );

    return [
        {
            id: `${object.id}:surface`,
            kind: 'surface-batch',
            name: `${object.name} 面`,
            depthRole: 'secondary',
            visible: object.visible,
            color: createVector3(0.12, 0.42, 0.8),
            opacity: 0.18,
            triangles: [
                { a: corners[0], b: corners[1], c: corners[2] },
                { a: corners[0], b: corners[2], c: corners[3] },
            ],
        } satisfies SurfaceBatchRenderNode,
        {
            id: object.id,
            kind: 'line-batch',
            name: object.name,
            depthRole: 'secondary',
            visible: object.visible,
            color: createVector3(0.22, 0.5, 0.9),
            segments: [
                createLineSegment3(corners[0], corners[1]),
                createLineSegment3(corners[1], corners[2]),
                createLineSegment3(corners[2], corners[3]),
                createLineSegment3(corners[3], corners[0]),
            ],
        } satisfies LineBatchRenderNode,
        {
            id: `${object.id}:label`,
            kind: 'label-batch',
            name: `${object.name} 标注`,
            depthRole: 'excluded',
            visible: object.visible,
            labels: [
                {
                    color: createVector3(0.86, 0.86, 0.86),
                    fontWeight: 400,
                    frame: {
                        origin: labelFrameOrigin,
                        xAxis: plane.xAxis,
                        yAxis: labelYAxis,
                    },
                    heightPixels: 15,
                    insert: {
                        x: 0,
                        y: 0,
                    },
                    paddingPixels: {
                        x: 6,
                        y: 6,
                    },
                    justify: {
                        baseline: 'alphabetic',
                        horizontal: 'left',
                        vertical: 'top',
                    },
                    text: getReferencePlaneLabel(object.planeKind),
                },
            ],
        } satisfies LabelBatchRenderNode,
    ];
}

function getReferencePlaneLabel(planeKind: ReferencePlaneObject['planeKind']): LabelText {
    if (planeKind === 'xy') {
        return 'Top';
    }

    if (planeKind === 'yz') {
        return 'Right';
    }

    return 'Front';
}

function addMany(origin: Vector3, ...vectors: readonly Vector3[]): Vector3 {
    return vectors.reduce((current, vector) => addVector3(current, vector), origin);
}

function findReferencePlaneById(
    partStudio: PartStudio,
    planeRef: string,
): ReferencePlaneObject | null {
    const object = partStudio.findObjectById(planeRef);

    return object?.kind === 'reference-plane' ? object : null;
}

function isDraftLineSegmentObject(object: {
    readonly kind: string;
}): object is DraftLineSegmentObject {
    return object.kind === 'line-segment';
}
