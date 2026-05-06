import {
    createLabelAtlas,
    createLabelAtlasFontWeightSignature,
    DEFAULT_LABEL_FONT_WEIGHT,
    type LabelAtlas,
} from '../labelAtlas';
import type { RenderGraph } from '../core';
import { collectSceneGraphObjects } from '../graphTraversal';
import { TextLabelSet } from '../scene';
import type { LabelFontWeight } from '../types';

export class LabelAtlasManager {
    private currentAtlas: LabelAtlas;
    private fontWeightSignature: string;

    constructor(private readonly context: WebGL2RenderingContext) {
        this.currentAtlas = createLabelAtlas(context);
        this.fontWeightSignature = this.currentAtlas.fontWeightSignature;
    }

    public get atlas(): LabelAtlas {
        return this.currentAtlas;
    }

    public ensureForGraph(graph: RenderGraph): LabelAtlas {
        const signature = createLabelAtlasFontWeightSignature(collectLabelFontWeights(graph));

        if (signature === this.fontWeightSignature) {
            return this.currentAtlas;
        }

        this.context.deleteTexture(this.currentAtlas.texture);
        this.currentAtlas = createLabelAtlas(this.context, collectLabelFontWeights(graph));
        this.fontWeightSignature = this.currentAtlas.fontWeightSignature;

        return this.currentAtlas;
    }

    public dispose(): void {
        this.context.deleteTexture(this.currentAtlas.texture);
    }
}

function collectLabelFontWeights(graph: RenderGraph): readonly LabelFontWeight[] {
    const seen = new Set<LabelFontWeight>();
    const fontWeights: LabelFontWeight[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (!(object instanceof TextLabelSet)) {
            continue;
        }

        for (const label of object.geometry.labels) {
            const fontWeight = label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT;

            if (!seen.has(fontWeight)) {
                seen.add(fontWeight);
                fontWeights.push(fontWeight);
            }
        }
    }

    return fontWeights;
}
