import { LineSegment3, Plane3, Vec2, Vec3, type Vector3 } from '@occt-draw/math';
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
import type {
    CadRenderActiveSketchPlane,
    CadRenderDocument,
    CadRenderDraft,
    CadRenderObject,
    CadRenderPartStudio,
    CadRenderPickRef,
    CadRenderPlaneKind,
    CadRenderReferenceOrigin,
    CadRenderReferencePlane,
    CadRenderSketch,
} from './cadRenderTypes';

const MODEL_LAYER_NAME = 'model';
const SKETCH_DRAFT_LAYER_NAME = 'sketch-draft';
const LABEL_HELPER_LAYER_NAME = 'label-helper';
const ACTIVE_SKETCH_PLANE_WIDTH_SCALE = 1.72;
const ACTIVE_SKETCH_PLANE_HEIGHT_SCALE = 1.28;
const CAD_RENDER_METADATA_SOURCE = 'cad-render';
const CAD_RENDER_PICK_REF_METADATA_KEY = 'pickRef';

export class DisplayProjector {
    public projectDocumentToGraph(document: CadRenderDocument): RenderGraph {
        return this.projectPartStudioToGraph(document.partStudio);
    }

    public projectPartStudioToGraph(partStudio: CadRenderPartStudio): RenderGraph {
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

        for (const object of this.projectActiveSketchPlane(partStudio.activeSketchPlane)) {
            if (object instanceof TextLabelSet) {
                labelHelperLayer.add(object);
            } else {
                sketchDraftLayer.add(object);
            }
        }

        for (const object of partStudio.sketches.flatMap(projectSketch)) {
            sketchDraftLayer.add(object);
        }

        for (const object of projectDraft(partStudio.draft ?? null)) {
            sketchDraftLayer.add(object);
        }

        graph.addLayer(modelLayer);
        graph.addLayer(sketchDraftLayer);
        graph.addLayer(labelHelperLayer);

        return graph;
    }

    public toRenderObject(object: CadRenderObject): RenderObject {
        const [renderObject] = this.toRenderObjects(object);

        if (!renderObject) {
            throw new Error(`Object projection failed: ${object.id}`);
        }

        return renderObject;
    }

    public toRenderObjects(object: CadRenderObject): readonly RenderObject[] {
        if (object.kind === 'reference-origin') {
            return [projectReferenceOriginObject(object)];
        }

        return projectReferencePlaneObject(object);
    }

    private projectActiveSketchPlane(
        activeSketchPlane: CadRenderActiveSketchPlane | null | undefined,
    ): readonly RenderObject[] {
        return activeSketchPlane ? projectActiveSketchPlaneObject(activeSketchPlane) : [];
    }
}

export function renderCadDocumentToGraph(document: CadRenderDocument): RenderGraph {
    return new DisplayProjector().projectDocumentToGraph(document);
}

export function renderCadPartStudioToGraph(partStudio: CadRenderPartStudio): RenderGraph {
    return new DisplayProjector().projectPartStudioToGraph(partStudio);
}

export function projectPartStudioToRenderGraph(partStudio: CadRenderPartStudio): RenderGraph {
    return renderCadPartStudioToGraph(partStudio);
}

function projectReferenceOriginObject(object: CadRenderReferenceOrigin): MarkerSet {
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

function projectReferencePlaneObject(object: CadRenderReferencePlane): readonly RenderObject[] {
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
                    justify: {
                        baseline: 'alphabetic',
                        horizontal: 'left',
                        vertical: 'top',
                    },
                    paddingPixels: {
                        x: 6,
                        y: 6,
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

function projectSketch(sketch: CadRenderSketch): readonly RenderObject[] {
    const objects: RenderObject[] = [];
    const segments = sketch.edges.map((edge) => edge.segment);
    const segmentMetadata = sketch.edges.map((edge) =>
        createCadRenderPrimitiveMetadata(edge.pickRef),
    );
    const points = sketch.vertices.map((vertex) => vertex.point);
    const pointMetadata = sketch.vertices.map((vertex) =>
        createCadRenderPrimitiveMetadata(vertex.pickRef),
    );

    if (segments.length > 0) {
        objects.push(
            new EdgeSet(
                new EdgeGeometry(segments, segmentMetadata),
                new EdgeStyle({ color: Vec3.of(0.05, 0.38, 0.85) }),
                {
                    depthRole: 'primary',
                    id: sketch.featureId,
                    interactionId: sketch.id,
                    name: sketch.name,
                    visible: sketch.visible,
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
                    id: `${sketch.featureId}:points`,
                    interactionId: sketch.id,
                    name: `${sketch.name} points`,
                    visible: sketch.visible,
                },
            ),
        );
    }

    return objects;
}

function projectActiveSketchPlaneObject(
    activeSketchPlane: CadRenderActiveSketchPlane,
): readonly RenderObject[] {
    const plane = referencePlaneToPlane(activeSketchPlane);
    const halfWidth = (activeSketchPlane.size * ACTIVE_SKETCH_PLANE_WIDTH_SCALE) / 2;
    const halfHeight = (activeSketchPlane.size * ACTIVE_SKETCH_PLANE_HEIGHT_SCALE) / 2;
    const corners = [
        plane.localToWorld(Vec2.of(-halfWidth, -halfHeight)),
        plane.localToWorld(Vec2.of(halfWidth, -halfHeight)),
        plane.localToWorld(Vec2.of(halfWidth, halfHeight)),
        plane.localToWorld(Vec2.of(-halfWidth, halfHeight)),
    ] as const;
    const labelFrameOrigin = plane.localToWorld(Vec2.of(-halfWidth, halfHeight));
    const labelYAxis = Vec3.scale(plane.yAxis, -1);
    const outline = [
        new LineSegment3(corners[0], corners[1]),
        new LineSegment3(corners[1], corners[2]),
        new LineSegment3(corners[2], corners[3]),
        new LineSegment3(corners[3], corners[0]),
    ];

    return [
        new FaceSet(
            new FaceGeometry([
                { a: corners[0], b: corners[1], c: corners[2] },
                { a: corners[0], b: corners[2], c: corners[3] },
            ]),
            new FaceStyle({
                color: Vec3.of(0.22, 0.52, 0.78),
                opacity: 0.06,
            }),
            {
                depthRole: 'primary',
                id: `${activeSketchPlane.featureId}:sketch-plane-overlay`,
                name: `${activeSketchPlane.name} sketch plane overlay`,
                pickable: false,
                visible: activeSketchPlane.visible,
            },
        ),
        new EdgeSet(
            new EdgeGeometry(outline),
            new EdgeStyle({ color: Vec3.of(0.25, 0.68, 0.96) }),
            {
                depthRole: 'primary',
                id: `${activeSketchPlane.featureId}:sketch-plane-outline`,
                name: `${activeSketchPlane.name} sketch plane outline`,
                pickable: false,
                visible: activeSketchPlane.visible,
            },
        ),
        new TextLabelSet(
            new TextGeometry([
                {
                    color: Vec3.of(0.25, 0.68, 0.96),
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
                    justify: {
                        baseline: 'alphabetic',
                        horizontal: 'left',
                        vertical: 'top',
                    },
                    paddingPixels: {
                        x: 6,
                        y: 6,
                    },
                    text: activeSketchPlane.name,
                },
            ]),
            new TextStyle(),
            {
                depthRole: 'excluded',
                id: `${activeSketchPlane.featureId}:sketch-plane-label`,
                name: `${activeSketchPlane.name} sketch plane label`,
                pickable: false,
                visible: activeSketchPlane.visible,
            },
        ),
    ];
}

function projectDraft(draft: CadRenderDraft | null): readonly RenderObject[] {
    if (!draft) {
        return [];
    }

    if (draft.temporaryLineSegments.length === 0 && draft.temporaryPoints.length === 0) {
        return [];
    }

    const segments = draft.temporaryLineSegments.map((object) => object.segment);
    const linePoints = segments.flatMap((segment) => [segment.start, segment.end]);
    const objects: RenderObject[] = [];

    if (segments.length > 0) {
        objects.push(
            new EdgeSet(
                new EdgeGeometry(segments),
                new EdgeStyle({ color: Vec3.of(0.35, 0.72, 1) }),
                {
                    depthRole: 'primary',
                    id: `${draft.id}:temporary-lines`,
                    name: 'temporary lines',
                    pickable: false,
                    visible: true,
                },
            ),
        );
    }

    if (linePoints.length > 0) {
        objects.push(
            new PointSet(
                new PointGeometry(linePoints),
                new PointStyle({
                    color: Vec3.of(0.35, 0.72, 1),
                    sizePixels: 7,
                }),
                {
                    depthRole: 'primary',
                    id: `${draft.id}:temporary-points`,
                    name: 'temporary points',
                    pickable: false,
                    visible: true,
                },
            ),
        );
    }

    for (const [index, point] of draft.temporaryPoints.entries()) {
        objects.push(
            new PointSet(
                new PointGeometry([point.point]),
                new PointStyle({
                    color: point.color ?? Vec3.of(0.35, 0.72, 1),
                    sizePixels: 10,
                }),
                {
                    depthRole: 'primary',
                    id: `${draft.id}:temporary-point:${String(index)}`,
                    name: 'temporary point',
                    pickable: false,
                    visible: point.visible,
                },
            ),
        );
    }

    return objects;
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

function getReferencePlaneLabel(planeKind: CadRenderPlaneKind): LabelText {
    if (planeKind === 'xy') {
        return 'Top';
    }

    if (planeKind === 'yz') {
        return 'Right';
    }

    return 'Front';
}

function referencePlaneToPlane(object: {
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly xAxis: Vector3;
}): Plane3 {
    return new Plane3(object.origin, object.normal, object.xAxis);
}

function createCadRenderPrimitiveMetadata(pickRef: CadRenderPickRef): ReadonlyMap<string, unknown> {
    return new Map<string, unknown>([
        ['source', CAD_RENDER_METADATA_SOURCE],
        [CAD_RENDER_PICK_REF_METADATA_KEY, pickRef],
    ]);
}
