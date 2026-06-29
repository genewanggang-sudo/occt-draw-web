import type { CadObject, ReferenceOriginObject, ReferencePlaneObject } from '@occt-draw/cad-model';
import type { CanvasObject, LabelText } from '@occt-draw/canvas';
import { LineSegment3, Plane3, Vec2, Vec3, type Vector3 } from '@occt-draw/math';
import { LABEL_HELPER_LAYER_ID, MODEL_LAYER_ID } from './canvasAdapterLayers';
import {
    ON_SHAPE_CONSTRUCTION_PLANE_FILL_COLOR,
    ON_SHAPE_CONSTRUCTION_PLANE_LABEL_COLOR,
    ON_SHAPE_CONSTRUCTION_PLANE_OUTLINE_COLOR,
    ON_SHAPE_REFERENCE_ORIGIN_POINT_COLOR,
    ON_SHAPE_REFERENCE_ORIGIN_POINT_FONT,
    ON_SHAPE_REFERENCE_ORIGIN_POINT_SIZE_PX,
} from './sketchPointVisuals';

export class CadObjectRenderAdapter {
    public createObjects(object: CadObject): readonly CanvasObject[] {
        if (object.kind === 'reference-origin') {
            return [this.createReferenceOrigin(object)];
        }

        return this.createReferencePlane(object);
    }

    public createReferenceOrigin(object: ReferenceOriginObject): CanvasObject {
        return {
            color: ON_SHAPE_REFERENCE_ORIGIN_POINT_COLOR,
            id: object.id,
            interactionId: object.id,
            kind: 'point',
            layerId: MODEL_LAYER_ID,
            name: object.name,
            pointFont: ON_SHAPE_REFERENCE_ORIGIN_POINT_FONT,
            pointRenderMode: 'billboard-font',
            points: [object.position],
            sizePixels: ON_SHAPE_REFERENCE_ORIGIN_POINT_SIZE_PX,
            visible: object.visible,
        };
    }

    public createReferencePlane(object: ReferencePlaneObject): readonly CanvasObject[] {
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
            {
                color: ON_SHAPE_CONSTRUCTION_PLANE_FILL_COLOR,
                depthRole: 'secondary',
                id: `${object.id}:surface`,
                interactionId: object.id,
                kind: 'face',
                layerId: MODEL_LAYER_ID,
                name: `${object.name} surface`,
                opacity: 0.18,
                pickGranularity: 'object',
                triangles: [
                    { a: corners[0], b: corners[1], c: corners[2] },
                    { a: corners[0], b: corners[2], c: corners[3] },
                ],
                visible: object.visible,
            },
            {
                color: ON_SHAPE_CONSTRUCTION_PLANE_OUTLINE_COLOR,
                depthRole: 'secondary',
                id: `${object.id}:outline`,
                interactionId: object.id,
                kind: 'edge',
                layerId: MODEL_LAYER_ID,
                name: object.name,
                pickGranularity: 'object',
                segments: [
                    new LineSegment3(corners[0], corners[1]),
                    new LineSegment3(corners[1], corners[2]),
                    new LineSegment3(corners[2], corners[3]),
                    new LineSegment3(corners[3], corners[0]),
                ],
                visible: object.visible,
            },
            {
                depthRole: 'excluded',
                id: `${object.id}:label`,
                kind: 'label',
                labels: [
                    {
                        color: ON_SHAPE_CONSTRUCTION_PLANE_LABEL_COLOR,
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
                ],
                layerId: LABEL_HELPER_LAYER_ID,
                name: `${object.name} label`,
                pickable: false,
                visible: object.visible,
            },
        ];
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

function referencePlaneToPlane(object: {
    readonly normal: Vector3;
    readonly origin: Vector3;
    readonly xAxis: Vector3;
}): Plane3 {
    return new Plane3(object.origin, object.normal, object.xAxis);
}
