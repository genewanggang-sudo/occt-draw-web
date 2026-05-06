import type { RenderObject } from '../core';
import { EdgeSet, FaceSet, MarkerSet, PointSet, TextLabelSet } from '../scene';
import type {
    LabelBatchRenderNode,
    LineBatchRenderNode,
    MarkerBatchRenderNode,
    PointBatchRenderNode,
    RenderNode,
    SurfaceBatchRenderNode,
} from '../types';

export class RenderObjectToLegacyNodeMapper {
    public map(object: RenderObject, layerVisible: boolean): RenderNode | null {
        const visible = layerVisible && object.visible;

        if (object instanceof FaceSet) {
            return {
                color: object.style.color,
                depthRole: object.depthRole,
                id: object.id,
                kind: 'surface-batch',
                name: object.name,
                opacity: object.style.opacity,
                triangles: object.geometry.triangles,
                visible,
            } satisfies SurfaceBatchRenderNode;
        }

        if (object instanceof EdgeSet) {
            return {
                color: object.style.color,
                depthRole: object.depthRole,
                id: object.id,
                kind: 'line-batch',
                name: object.name,
                segments: object.geometry.segments,
                visible,
            } satisfies LineBatchRenderNode;
        }

        if (object instanceof PointSet) {
            return {
                color: object.style.color,
                depthRole: object.depthRole,
                id: object.id,
                kind: 'point-batch',
                name: object.name,
                points: object.geometry.points,
                sizePixels: object.style.sizePixels,
                visible,
            } satisfies PointBatchRenderNode;
        }

        if (object instanceof MarkerSet) {
            return {
                depthRole: object.depthRole,
                id: object.id,
                kind: 'marker-batch',
                markers: object.geometry.markers,
                name: object.name,
                visible,
            } satisfies MarkerBatchRenderNode;
        }

        if (object instanceof TextLabelSet) {
            return {
                depthRole: object.depthRole,
                id: object.id,
                kind: 'label-batch',
                labels: object.geometry.labels,
                name: object.name,
                visible,
            } satisfies LabelBatchRenderNode;
        }

        return null;
    }
}
