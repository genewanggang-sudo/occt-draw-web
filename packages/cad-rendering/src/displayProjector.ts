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
import { LineSegment3, Vec2, Vec3 } from '@occt-draw/math';
import {
    findSketchPointById,
    listSketchLines,
    listSketchPoints,
    sketchPointToWorldOnPlane,
    type Sketch,
    type SketchId,
} from '@occt-draw/sketch';
import {
    EdgeGeometry,
    EdgeSet,
    EdgeStyle,
    FaceGeometry,
    FaceSet,
    FaceStyle,
    LegacyRenderSceneGraphAdapter,
    MarkerGeometry,
    MarkerSet,
    MarkerStyle,
    PointGeometry,
    PointSet,
    PointStyle,
    RenderGraph,
    RenderLayer,
    TextGeometry,
    TextLabelSet,
    TextStyle,
    type LabelText,
    type RenderNode,
    type RenderObject,
    type RenderScene,
} from '@occt-draw/webgl-engine';

export interface DisplayProjectionContext {
    readonly sketchesById?: Readonly<Record<SketchId, Sketch>>;
}

const EMPTY_DISPLAY_PROJECTION_CONTEXT: DisplayProjectionContext = {
    sketchesById: {},
};
const LEGACY_RENDER_SCENE_GRAPH_ADAPTER = new LegacyRenderSceneGraphAdapter();
const MODEL_LAYER_NAME = 'model';
const SKETCH_DRAFT_LAYER_NAME = 'sketch-draft';
const LABEL_HELPER_LAYER_NAME = 'label-helper';

export class DisplayProjector {
    public projectDocument(
        document: CadDocument,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderScene {
        return this.projectDocumentToRenderScene(document, draft, context);
    }

    public projectDocumentToGraph(
        document: CadDocument,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderGraph {
        return this.projectPartStudioToGraph(document.getActivePartStudio(), draft, context);
    }

    public projectDocumentToRenderScene(
        document: CadDocument,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderScene {
        const partStudio = document.getActivePartStudio();

        return this.projectPartStudioToRenderScene(partStudio, draft, context);
    }

    public projectPartStudio(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderScene {
        return this.projectPartStudioToRenderScene(partStudio, draft, context);
    }

    public projectPartStudioToGraph(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderGraph {
        const graph = new RenderGraph();
        const modelLayer = new RenderLayer(MODEL_LAYER_NAME);
        const sketchDraftLayer = new RenderLayer(SKETCH_DRAFT_LAYER_NAME);
        const labelHelperLayer = new RenderLayer(LABEL_HELPER_LAYER_NAME, {
            navigationRole: 'excluded',
            pickable: false,
        });

        for (const object of partStudio.objects) {
            addObjectsToLayers(this.toRenderObjects(object), modelLayer, labelHelperLayer);
        }

        for (const object of this.projectSketchFeatures(partStudio, context)) {
            sketchDraftLayer.add(object);
        }

        for (const object of this.projectDraftObjects(draft)) {
            sketchDraftLayer.add(object);
        }

        graph.addLayer(modelLayer);
        graph.addLayer(sketchDraftLayer);
        graph.addLayer(labelHelperLayer);

        return graph;
    }

    public projectPartStudioToRenderScene(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
    ): RenderScene {
        return LEGACY_RENDER_SCENE_GRAPH_ADAPTER.toRenderScene(
            this.projectPartStudioToGraph(partStudio, draft, context),
            { id: partStudio.id, name: partStudio.name },
        );
    }

    public toRenderObject(object: CadObject): RenderObject {
        const [renderObject] = this.toRenderObjects(object);

        if (!renderObject) {
            throw new Error(`Object projection failed: ${object.id}`);
        }

        return renderObject;
    }

    public toRenderObjects(object: CadObject): readonly RenderObject[] {
        if (object.kind === 'reference-origin') {
            return [projectReferenceOriginObject(object)];
        }

        return projectReferencePlaneObject(object);
    }

    public toRenderNode(object: CadObject): RenderNode {
        const [renderNode] = this.toRenderNodes(object);

        if (!renderNode) {
            throw new Error(`Legacy object projection failed: ${object.id}`);
        }

        return renderNode;
    }

    public toRenderNodes(object: CadObject): readonly RenderNode[] {
        return LEGACY_RENDER_SCENE_GRAPH_ADAPTER.toRenderScene(
            createRenderGraphFromObjects(this.toRenderObjects(object)),
            { id: object.id, name: object.name },
        ).nodes;
    }

    private projectSketchFeatures(
        partStudio: PartStudio,
        context: DisplayProjectionContext,
    ): readonly RenderObject[] {
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
            const objects: RenderObject[] = [];
            const segments = listSketchLines(sketch).flatMap((line) => {
                const startPoint = findSketchPointById(sketch, line.startPointId);
                const endPoint = findSketchPointById(sketch, line.endPointId);

                if (!startPoint || !endPoint) {
                    return [];
                }

                return [
                    new LineSegment3(
                        sketchPointToWorldOnPlane(plane, startPoint),
                        sketchPointToWorldOnPlane(plane, endPoint),
                    ),
                ];
            });
            const points = listSketchPoints(sketch).map((point) =>
                sketchPointToWorldOnPlane(plane, point),
            );

            if (segments.length > 0) {
                objects.push(
                    new EdgeSet(
                        new EdgeGeometry(segments),
                        new EdgeStyle({ color: Vec3.of(0.05, 0.38, 0.85) }),
                        {
                            depthRole: 'primary',
                            id: feature.id,
                            name: feature.name,
                            visible: !feature.suppressed,
                        },
                    ),
                );
            }

            if (points.length > 0) {
                objects.push(
                    new PointSet(
                        new PointGeometry(points),
                        new PointStyle({
                            color: Vec3.of(0.05, 0.38, 0.85),
                            sizePixels: 7,
                        }),
                        {
                            depthRole: 'primary',
                            id: `${feature.id}:points`,
                            name: `${feature.name} points`,
                            visible: !feature.suppressed,
                        },
                    ),
                );
            }

            return objects;
        });
    }

    private projectDraftObjects(draft: EditDraft | null): readonly RenderObject[] {
        if (!draft) {
            return [];
        }

        const temporaryLineSegments = draft.temporaryObjects.filter(isDraftLineSegmentObject);

        if (temporaryLineSegments.length === 0) {
            return [];
        }

        const segments = temporaryLineSegments.map((object) => object.segment);

        return [
            new EdgeSet(
                new EdgeGeometry(segments),
                new EdgeStyle({ color: Vec3.of(0.35, 0.72, 1) }),
                {
                    depthRole: 'primary',
                    id: `${draft.id}:temporary-lines`,
                    name: 'temporary lines',
                    visible: true,
                },
            ),
            new PointSet(
                new PointGeometry(segments.flatMap((segment) => [segment.start, segment.end])),
                new PointStyle({
                    color: Vec3.of(0.35, 0.72, 1),
                    sizePixels: 7,
                }),
                {
                    depthRole: 'primary',
                    id: `${draft.id}:temporary-points`,
                    name: 'temporary points',
                    visible: true,
                },
            ),
        ];
    }
}

export function projectDocumentToRenderScene(
    document: CadDocument,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderScene {
    return new DisplayProjector().projectDocumentToRenderScene(document, draft, context);
}

export function projectDocumentToRenderGraph(
    document: CadDocument,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderGraph {
    return new DisplayProjector().projectDocumentToGraph(document, draft, context);
}

export function projectPartStudioToRenderScene(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderScene {
    return new DisplayProjector().projectPartStudioToRenderScene(partStudio, draft, context);
}

export function projectPartStudioToRenderGraph(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
    context: DisplayProjectionContext = EMPTY_DISPLAY_PROJECTION_CONTEXT,
): RenderGraph {
    return new DisplayProjector().projectPartStudioToGraph(partStudio, draft, context);
}

function projectReferenceOriginObject(object: ReferenceOriginObject): MarkerSet {
    return new MarkerSet(
        new MarkerGeometry([
            {
                color: Vec3.of(0.78, 0.8, 0.82),
                position: object.position,
                shape: 'origin',
                sizePixels: 13,
            },
        ]),
        new MarkerStyle(),
        {
            depthRole: 'primary',
            id: object.id,
            name: object.name,
            visible: object.visible,
        },
    );
}

function projectReferencePlaneObject(object: ReferencePlaneObject): readonly RenderObject[] {
    const plane = referencePlaneToPlane(object);
    const halfSize = object.size / 2;
    const labelYAxis = Vec3.scale(plane.yAxis, -1);
    const corners = [
        plane.localToWorld(Vec2.of(-halfSize, -halfSize)),
        plane.localToWorld(Vec2.of(halfSize, -halfSize)),
        plane.localToWorld(Vec2.of(halfSize, halfSize)),
        plane.localToWorld(Vec2.of(-halfSize, halfSize)),
    ] as const;
    const labelFrameOrigin = plane.localToWorld(Vec2.of(-halfSize, halfSize));

    return [
        new FaceSet(
            new FaceGeometry([
                { a: corners[0], b: corners[1], c: corners[2] },
                { a: corners[0], b: corners[2], c: corners[3] },
            ]),
            new FaceStyle({
                color: Vec3.of(0.12, 0.42, 0.8),
                opacity: 0.18,
            }),
            {
                depthRole: 'secondary',
                id: `${object.id}:surface`,
                name: `${object.name} surface`,
                visible: object.visible,
            },
        ),
        new EdgeSet(
            new EdgeGeometry([
                new LineSegment3(corners[0], corners[1]),
                new LineSegment3(corners[1], corners[2]),
                new LineSegment3(corners[2], corners[3]),
                new LineSegment3(corners[3], corners[0]),
            ]),
            new EdgeStyle({ color: Vec3.of(0.22, 0.5, 0.9) }),
            {
                depthRole: 'secondary',
                id: object.id,
                name: object.name,
                visible: object.visible,
            },
        ),
        new TextLabelSet(
            new TextGeometry([
                {
                    color: Vec3.of(0.86, 0.86, 0.86),
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
            ]),
            new TextStyle(),
            {
                depthRole: 'excluded',
                id: `${object.id}:label`,
                name: `${object.name} label`,
                pickable: false,
                visible: object.visible,
            },
        ),
    ];
}

function addObjectsToLayers(
    objects: readonly RenderObject[],
    modelLayer: RenderLayer,
    labelHelperLayer: RenderLayer,
): void {
    for (const object of objects) {
        if (object instanceof TextLabelSet) {
            labelHelperLayer.add(object);
        } else {
            modelLayer.add(object);
        }
    }
}

function createRenderGraphFromObjects(objects: readonly RenderObject[]): RenderGraph {
    const graph = new RenderGraph();
    const modelLayer = new RenderLayer(MODEL_LAYER_NAME);
    const labelHelperLayer = new RenderLayer(LABEL_HELPER_LAYER_NAME, {
        navigationRole: 'excluded',
        pickable: false,
    });

    addObjectsToLayers(objects, modelLayer, labelHelperLayer);
    graph.addLayer(modelLayer);
    graph.addLayer(labelHelperLayer);

    return graph;
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
