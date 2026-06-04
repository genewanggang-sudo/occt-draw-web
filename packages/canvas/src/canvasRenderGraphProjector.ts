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
    type RenderObjectOptions,
    type RenderObject,
} from '@occt-draw/webgl-engine';
import type { CanvasObject, CanvasScene } from './canvasTypes';

export class CanvasRenderGraphProjector {
    public projectSceneToGraph(scene: CanvasScene): RenderGraph {
        const graph = new RenderGraph();
        const layers = new Map<string, RenderLayer>();

        for (const layer of scene.layers) {
            const renderLayer = new RenderLayer(layer.id, {
                ...(layer.depthPolicy ? { depthPolicy: layer.depthPolicy } : {}),
                ...(layer.navigationRole ? { navigationRole: layer.navigationRole } : {}),
                ...(layer.pickable !== undefined ? { pickable: layer.pickable } : {}),
                ...(layer.sortPolicy ? { sortPolicy: layer.sortPolicy } : {}),
                ...(layer.visible !== undefined ? { visible: layer.visible } : {}),
            });

            layers.set(layer.id, renderLayer);
            graph.addLayer(renderLayer);
        }

        for (const object of scene.objects) {
            resolveLayer(layers, object.layerId).add(this.toRenderObject(object));
        }

        return graph;
    }

    public toRenderObject(object: CanvasObject): RenderObject {
        if (object.kind === 'face') {
            return new FaceSet(
                new FaceGeometry(object.triangles),
                new FaceStyle({
                    color: object.color,
                    ...(object.opacity !== undefined ? { opacity: object.opacity } : {}),
                }),
                createRenderObjectOptions(object),
            );
        }

        if (object.kind === 'edge') {
            return new EdgeSet(
                new EdgeGeometry(object.segments, object.primitiveMetadata ?? []),
                new EdgeStyle({
                    color: object.color,
                    ...(object.lineStyle ? { lineStyle: object.lineStyle } : {}),
                }),
                createRenderObjectOptions(object),
            );
        }

        if (object.kind === 'point') {
            return new PointSet(
                new PointGeometry(object.points, object.primitiveMetadata ?? []),
                new PointStyle({
                    color: object.color,
                    ...(object.sizePixels !== undefined ? { sizePixels: object.sizePixels } : {}),
                }),
                createRenderObjectOptions(object),
            );
        }

        if (object.kind === 'marker') {
            return new MarkerSet(
                new MarkerGeometry(object.markers),
                new MarkerStyle(),
                createRenderObjectOptions(object),
            );
        }

        return new TextLabelSet(
            new TextGeometry(object.labels),
            new TextStyle(),
            createRenderObjectOptions(object),
        );
    }
}

export function renderCanvasSceneToGraph(scene: CanvasScene): RenderGraph {
    return new CanvasRenderGraphProjector().projectSceneToGraph(scene);
}

function createRenderObjectOptions(object: CanvasObject): RenderObjectOptions {
    let options: RenderObjectOptions = {
        id: object.id,
        name: object.name,
        visible: object.visible,
    };

    if (object.depthRole) {
        options = withOption(options, { depthRole: object.depthRole });
    }

    if (object.interactionId) {
        options = withOption(options, { interactionId: object.interactionId });
    }

    if (object.metadata) {
        options = withOption(options, { metadata: object.metadata });
    }

    if (object.pickGranularity) {
        options = withOption(options, { pickGranularity: object.pickGranularity });
    }

    if (object.pickable !== undefined) {
        options = withOption(options, { pickable: object.pickable });
    }

    return options;
}

function withOption(
    options: RenderObjectOptions,
    option: RenderObjectOptions,
): RenderObjectOptions {
    return {
        ...options,
        ...option,
    };
}

function resolveLayer(layers: ReadonlyMap<string, RenderLayer>, layerId: string): RenderLayer {
    const layer = layers.get(layerId);

    if (!layer) {
        throw new Error(`Canvas layer is not defined: ${layerId}`);
    }

    return layer;
}
