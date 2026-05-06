import type { RenderObject } from '../core';
import {
    EdgeGeometry,
    FaceGeometry,
    MarkerGeometry,
    PointGeometry,
    TextGeometry,
} from '../geometry';
import { EdgeSet, FaceSet, MarkerSet, PointSet, TextLabelSet } from '../scene';
import { EdgeStyle, FaceStyle, MarkerStyle, PointStyle, TextStyle } from '../style';
import type { RenderNode } from './legacyTypes';

export class LegacyRenderNodeToObjectMapper {
    public map(node: RenderNode): RenderObject {
        const options = {
            depthRole: node.depthRole,
            id: node.id,
            name: node.name,
            visible: node.visible,
        } as const;

        if (node.kind === 'surface-batch') {
            return new FaceSet(
                new FaceGeometry(node.triangles),
                new FaceStyle({ color: node.color, opacity: node.opacity }),
                options,
            );
        }

        if (node.kind === 'line-batch') {
            return new EdgeSet(
                new EdgeGeometry(node.segments),
                new EdgeStyle({ color: node.color }),
                options,
            );
        }

        if (node.kind === 'point-batch') {
            return new PointSet(
                new PointGeometry(node.points),
                new PointStyle({ color: node.color, sizePixels: node.sizePixels }),
                options,
            );
        }

        if (node.kind === 'marker-batch') {
            return new MarkerSet(new MarkerGeometry(node.markers), new MarkerStyle(), options);
        }

        return new TextLabelSet(new TextGeometry(node.labels), new TextStyle(), {
            ...options,
            pickable: false,
        });
    }
}
