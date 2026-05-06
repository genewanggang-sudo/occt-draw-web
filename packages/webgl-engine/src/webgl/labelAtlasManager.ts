import {
    createLabelAtlas,
    createLabelAtlasFontWeightSignature,
    DEFAULT_LABEL_FONT_WEIGHT,
    type LabelAtlas,
} from '../labelAtlas';
import type { LabelFontWeight, RenderScene } from '../types';

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

    public ensureForScene(scene: RenderScene): LabelAtlas {
        const signature = createLabelAtlasFontWeightSignature(collectLabelFontWeights(scene));

        if (signature === this.fontWeightSignature) {
            return this.currentAtlas;
        }

        this.context.deleteTexture(this.currentAtlas.texture);
        this.currentAtlas = createLabelAtlas(this.context, collectLabelFontWeights(scene));
        this.fontWeightSignature = this.currentAtlas.fontWeightSignature;

        return this.currentAtlas;
    }

    public dispose(): void {
        this.context.deleteTexture(this.currentAtlas.texture);
    }
}

function collectLabelFontWeights(scene: RenderScene): readonly LabelFontWeight[] {
    const seen = new Set<LabelFontWeight>();
    const fontWeights: LabelFontWeight[] = [];

    for (const object of scene.nodes) {
        if (!object.visible || object.kind !== 'label-batch') {
            continue;
        }

        for (const label of object.labels) {
            const fontWeight = label.fontWeight ?? DEFAULT_LABEL_FONT_WEIGHT;

            if (!seen.has(fontWeight)) {
                seen.add(fontWeight);
                fontWeights.push(fontWeight);
            }
        }
    }

    return fontWeights;
}
