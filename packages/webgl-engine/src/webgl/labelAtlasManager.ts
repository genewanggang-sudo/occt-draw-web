import {
    createLabelAtlas,
    createLabelAtlasFontWeightSignature,
    createLabelAtlasTextSignature,
    DEFAULT_LABEL_FONT_WEIGHT,
    type LabelAtlas,
} from '../labelAtlas';
import type { RenderGraph } from '../core';
import { collectSceneGraphObjects } from '../graphTraversal';
import { TextLabelSet } from '../scene';
import type { LabelFontWeight, LabelText } from '../types';

export class LabelAtlasManager {
    private currentAtlas: LabelAtlas;
    private fontWeightSignature: string;
    private textSignature: string;

    constructor(private readonly context: WebGL2RenderingContext) {
        this.currentAtlas = createLabelAtlas(context);
        this.fontWeightSignature = this.currentAtlas.fontWeightSignature;
        this.textSignature = this.currentAtlas.textSignature;
    }

    public get atlas(): LabelAtlas {
        return this.currentAtlas;
    }

    public ensureForGraph(graph: RenderGraph): LabelAtlas {
        const fontWeights = collectLabelFontWeights(graph);
        const texts = collectLabelTexts(graph);
        const signature = createLabelAtlasFontWeightSignature(fontWeights);
        const textSignature = createLabelAtlasTextSignature(texts);

        if (signature === this.fontWeightSignature && textSignature === this.textSignature) {
            return this.currentAtlas;
        }

        this.context.deleteTexture(this.currentAtlas.texture);
        this.currentAtlas = createLabelAtlas(this.context, fontWeights, texts);
        this.fontWeightSignature = this.currentAtlas.fontWeightSignature;
        this.textSignature = this.currentAtlas.textSignature;

        return this.currentAtlas;
    }

    public dispose(): void {
        this.context.deleteTexture(this.currentAtlas.texture);
    }
}

function collectLabelTexts(graph: RenderGraph): readonly LabelText[] {
    const seen = new Set<LabelText>();
    const texts: LabelText[] = [];

    for (const { object } of collectSceneGraphObjects(graph)) {
        if (!(object instanceof TextLabelSet)) {
            continue;
        }

        for (const label of object.geometry.labels) {
            if (!seen.has(label.text)) {
                seen.add(label.text);
                texts.push(label.text);
            }
        }
    }

    return texts;
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
