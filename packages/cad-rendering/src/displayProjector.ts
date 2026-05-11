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
import { getSketchForFeature, SketchDisplayBuilder, type SketchEntityRef } from '@occt-draw/sketch';
import {
    EdgeGeometry,
    EdgeSet,
    EdgeStyle,
    FaceGeometry,
    FaceSet,
    FaceStyle,
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
    type RenderObject,
} from '@occt-draw/webgl-engine';

const MODEL_LAYER_NAME = 'model';
const SKETCH_DRAFT_LAYER_NAME = 'sketch-draft';
const LABEL_HELPER_LAYER_NAME = 'label-helper';
const SKETCH_PLANE_GRID_DIVISIONS = 10;

export interface DisplayProjectorOptions {
    readonly activeSketchFeatureId?: string | null;
}

export class DisplayProjector {
    public projectDocument(
        document: CadDocument,
        draft: EditDraft | null = null,
        options: DisplayProjectorOptions = {},
    ): RenderGraph {
        return this.projectDocumentToGraph(document, draft, options);
    }

    public projectDocumentToGraph(
        document: CadDocument,
        draft: EditDraft | null = null,
        options: DisplayProjectorOptions = {},
    ): RenderGraph {
        return this.projectPartStudioToGraph(document.getActivePartStudio(), draft, options);
    }

    public projectPartStudio(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        options: DisplayProjectorOptions = {},
    ): RenderGraph {
        return this.projectPartStudioToGraph(partStudio, draft, options);
    }

    public projectPartStudioToGraph(
        partStudio: PartStudio,
        draft: EditDraft | null = null,
        options: DisplayProjectorOptions = {},
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

        for (const object of this.projectActiveSketchPlane(partStudio, options)) {
            sketchDraftLayer.add(object);
        }

        for (const object of this.projectSketchFeatures(partStudio)) {
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

    private projectSketchFeatures(partStudio: PartStudio): readonly RenderObject[] {
        return partStudio.features.flatMap((feature) => {
            if (feature.type !== 'sketch' || !feature.payloadRef) {
                return [];
            }

            const sketch = getSketchForFeature(partStudio, feature);

            if (!sketch) {
                return [];
            }

            const sketchPlane = findReferencePlaneById(partStudio, sketch.planeRef);

            if (!sketchPlane) {
                return [];
            }

            const plane = referencePlaneToPlane(sketchPlane);
            const objects: RenderObject[] = [];
            const display = new SketchDisplayBuilder().build(sketch, plane);
            const segments = display.edges.map((edge) => edge.segment);
            const segmentMetadata = display.edges.map((edge) =>
                createSketchPrimitiveMetadata(edge.ref),
            );
            const points = display.vertices.map((vertex) => vertex.point);
            const pointMetadata = display.vertices.map((vertex) =>
                createSketchPrimitiveMetadata(vertex.ref),
            );

            if (segments.length > 0) {
                objects.push(
                    new EdgeSet(
                        new EdgeGeometry(segments, segmentMetadata),
                        new EdgeStyle({ color: Vec3.of(0.05, 0.38, 0.85) }),
                        {
                            depthRole: 'primary',
                            id: feature.id,
                            interactionId: sketch.id,
                            name: feature.name,
                            visible: !feature.suppressed,
                        },
                    ),
                );
            }

            if (points.length > 0) {
                objects.push(
                    new PointSet(
                        new PointGeometry(points, pointMetadata),
                        new PointStyle({
                            color: Vec3.of(0.05, 0.38, 0.85),
                            sizePixels: 7,
                        }),
                        {
                            depthRole: 'primary',
                            id: `${feature.id}:points`,
                            interactionId: sketch.id,
                            name: `${feature.name} points`,
                            visible: !feature.suppressed,
                        },
                    ),
                );
            }

            return objects;
        });
    }

    private projectActiveSketchPlane(
        partStudio: PartStudio,
        options: DisplayProjectorOptions,
    ): readonly RenderObject[] {
        if (!options.activeSketchFeatureId) {
            return [];
        }

        const feature = partStudio.features.find(
            (candidate) => candidate.id === options.activeSketchFeatureId,
        );

        if (feature?.type !== 'sketch') {
            return [];
        }

        const sketch = getSketchForFeature(partStudio, feature);

        if (!sketch) {
            return [];
        }

        const sketchPlane = findReferencePlaneById(partStudio, sketch.planeRef);

        if (!sketchPlane) {
            return [];
        }

        return projectActiveSketchPlaneObject(sketchPlane, feature.id);
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

export function projectDocumentToRenderGraph(
    document: CadDocument,
    draft: EditDraft | null = null,
    options: DisplayProjectorOptions = {},
): RenderGraph {
    return new DisplayProjector().projectDocumentToGraph(document, draft, options);
}

export function projectPartStudioToRenderGraph(
    partStudio: PartStudio,
    draft: EditDraft | null = null,
    options: DisplayProjectorOptions = {},
): RenderGraph {
    return new DisplayProjector().projectPartStudioToGraph(partStudio, draft, options);
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
                interactionId: object.id,
                name: `${object.name} surface`,
                pickGranularity: 'object',
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
                id: `${object.id}:outline`,
                interactionId: object.id,
                name: object.name,
                pickGranularity: 'object',
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

function projectActiveSketchPlaneObject(
    object: ReferencePlaneObject,
    sketchFeatureId: string,
): readonly RenderObject[] {
    const plane = referencePlaneToPlane(object);
    const halfSize = object.size / 2;
    const corners = [
        plane.localToWorld(Vec2.of(-halfSize, -halfSize)),
        plane.localToWorld(Vec2.of(halfSize, -halfSize)),
        plane.localToWorld(Vec2.of(halfSize, halfSize)),
        plane.localToWorld(Vec2.of(-halfSize, halfSize)),
    ] as const;
    const gridSegments = createSketchPlaneGridSegments(plane, object.size);

    return [
        new FaceSet(
            new FaceGeometry([
                { a: corners[0], b: corners[1], c: corners[2] },
                { a: corners[0], b: corners[2], c: corners[3] },
            ]),
            new FaceStyle({
                color: Vec3.of(0.1, 0.16, 0.22),
                opacity: 0.12,
            }),
            {
                depthRole: 'primary',
                id: `${sketchFeatureId}:work-plane`,
                name: `${object.name} sketch work plane`,
                pickable: false,
                visible: object.visible,
            },
        ),
        new EdgeSet(
            new EdgeGeometry(gridSegments.minor),
            new EdgeStyle({ color: Vec3.of(0.2, 0.34, 0.44) }),
            {
                depthRole: 'primary',
                id: `${sketchFeatureId}:work-plane:grid`,
                name: `${object.name} sketch work plane grid`,
                pickable: false,
                visible: object.visible,
            },
        ),
        new EdgeSet(
            new EdgeGeometry(gridSegments.major),
            new EdgeStyle({ color: Vec3.of(0.44, 0.66, 0.82) }),
            {
                depthRole: 'primary',
                id: `${sketchFeatureId}:work-plane:axes`,
                name: `${object.name} sketch work plane axes`,
                pickable: false,
                visible: object.visible,
            },
        ),
    ];
}

function createSketchPlaneGridSegments(
    plane: ReturnType<typeof referencePlaneToPlane>,
    size: number,
): { readonly major: readonly LineSegment3[]; readonly minor: readonly LineSegment3[] } {
    const halfSize = size / 2;
    const minor: LineSegment3[] = [];
    const major: LineSegment3[] = [
        new LineSegment3(
            plane.localToWorld(Vec2.of(-halfSize, 0)),
            plane.localToWorld(Vec2.of(halfSize, 0)),
        ),
        new LineSegment3(
            plane.localToWorld(Vec2.of(0, -halfSize)),
            plane.localToWorld(Vec2.of(0, halfSize)),
        ),
    ];

    for (
        let index = -SKETCH_PLANE_GRID_DIVISIONS;
        index <= SKETCH_PLANE_GRID_DIVISIONS;
        index += 1
    ) {
        if (index === 0) {
            continue;
        }

        const offset = (index / SKETCH_PLANE_GRID_DIVISIONS) * halfSize;

        minor.push(
            new LineSegment3(
                plane.localToWorld(Vec2.of(offset, -halfSize)),
                plane.localToWorld(Vec2.of(offset, halfSize)),
            ),
            new LineSegment3(
                plane.localToWorld(Vec2.of(-halfSize, offset)),
                plane.localToWorld(Vec2.of(halfSize, offset)),
            ),
        );
    }

    return { major, minor };
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

function createSketchPrimitiveMetadata(ref: SketchEntityRef): ReadonlyMap<string, unknown> {
    return new Map<string, unknown>([
        ['source', 'sketch'],
        ['sketchEntityRef', ref],
    ]);
}
