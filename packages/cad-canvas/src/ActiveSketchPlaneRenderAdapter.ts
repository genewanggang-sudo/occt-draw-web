import { getSketchForFeature, type PartStudio } from '@occt-draw/cad-model';
import type { CanvasObject } from '@occt-draw/canvas';
import { LineSegment3, Plane3, Vec2, Vec3, type Vector3 } from '@occt-draw/math';
import { EDIT_PREVIEW_LAYER_ID, LABEL_HELPER_LAYER_ID } from './canvasAdapterLayers';
import { ReferencePlaneResolver } from './ReferencePlaneResolver';

const ACTIVE_PLANE_WIDTH_SCALE = 1.72;
const ACTIVE_PLANE_HEIGHT_SCALE = 1.28;

export interface CreateActiveSketchPlaneRenderInput {
    readonly activeSketchFeatureId: string | null;
    readonly partStudio: PartStudio;
}

export class ActiveSketchPlaneRenderAdapter {
    private readonly referencePlaneResolver: ReferencePlaneResolver;

    constructor(input: { readonly referencePlaneResolver?: ReferencePlaneResolver } = {}) {
        this.referencePlaneResolver = input.referencePlaneResolver ?? new ReferencePlaneResolver();
    }

    public createActiveSketchPlaneObjects(
        input: CreateActiveSketchPlaneRenderInput,
    ): readonly CanvasObject[] {
        if (!input.activeSketchFeatureId) {
            return [];
        }

        const feature = input.partStudio.findFeatureById(input.activeSketchFeatureId);
        const sketch = feature ? getSketchForFeature(input.partStudio, feature) : null;

        if (!feature || !sketch) {
            return [];
        }

        const referencePlane = this.referencePlaneResolver.findReferencePlaneById(
            input.partStudio,
            sketch.plane.planeObjectRef.id,
        );

        if (!referencePlane) {
            return [];
        }

        const plane = referencePlaneToPlane(referencePlane);
        const halfWidth = (referencePlane.size * ACTIVE_PLANE_WIDTH_SCALE) / 2;
        const halfHeight = (referencePlane.size * ACTIVE_PLANE_HEIGHT_SCALE) / 2;
        const corners = [
            plane.localToWorld(Vec2.of(-halfWidth, -halfHeight)),
            plane.localToWorld(Vec2.of(halfWidth, -halfHeight)),
            plane.localToWorld(Vec2.of(halfWidth, halfHeight)),
            plane.localToWorld(Vec2.of(-halfWidth, halfHeight)),
        ] as const;
        const labelFrameOrigin = plane.localToWorld(Vec2.of(-halfWidth, halfHeight));
        const labelYAxis = Vec3.scale(plane.yAxis, -1);

        return [
            {
                color: Vec3.of(0.22, 0.52, 0.78),
                depthRole: 'primary',
                id: `${feature.id}:edit-plane-overlay`,
                kind: 'face',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} edit plane overlay`,
                opacity: 0.06,
                pickable: false,
                triangles: [
                    { a: corners[0], b: corners[1], c: corners[2] },
                    { a: corners[0], b: corners[2], c: corners[3] },
                ],
                visible: referencePlane.visible,
            },
            {
                color: Vec3.of(0.25, 0.68, 0.96),
                depthRole: 'primary',
                id: `${feature.id}:edit-plane-outline`,
                kind: 'edge',
                layerId: EDIT_PREVIEW_LAYER_ID,
                name: `${feature.name} edit plane outline`,
                pickable: false,
                segments: [
                    new LineSegment3(corners[0], corners[1]),
                    new LineSegment3(corners[1], corners[2]),
                    new LineSegment3(corners[2], corners[3]),
                    new LineSegment3(corners[3], corners[0]),
                ],
                visible: referencePlane.visible,
            },
            {
                depthRole: 'excluded',
                id: `${feature.id}:edit-plane-label`,
                kind: 'label',
                labels: [
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
                        text: feature.name,
                    },
                ],
                layerId: LABEL_HELPER_LAYER_ID,
                name: `${feature.name} edit plane label`,
                pickable: false,
                visible: referencePlane.visible,
            },
        ];
    }
}

function referencePlaneToPlane(object: {
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly xAxis: Vector3;
}): Plane3 {
    return new Plane3(object.origin, object.normal, object.xAxis);
}
