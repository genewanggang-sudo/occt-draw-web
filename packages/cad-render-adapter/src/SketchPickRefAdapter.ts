import type { CadRenderPickRef } from '@occt-draw/cad-rendering';
import { SketchEntityKind, type SketchEntityRef } from '@occt-draw/sketch';

export class SketchPickRefAdapter {
    public createSketchPickRef(featureId: string, ref: SketchEntityRef): CadRenderPickRef {
        const entityKind = this.getPickableEntityKind(ref);
        return {
            domain: 'sketch',
            entityId: this.getSketchEntityId(ref),
            ...(entityKind ? { entityKind } : {}),
            featureId,
            objectId: ref.sketchId,
        };
    }

    public getSketchEntityId(ref: SketchEntityRef): string {
        return ref.entityId;
    }

    private getPickableEntityKind(ref: SketchEntityRef): CadRenderPickRef['entityKind'] | null {
        switch (ref.kind) {
            case SketchEntityKind.Edge:
                return 'edge';
            case SketchEntityKind.Vertex:
                return 'vertex';
            case SketchEntityKind.Constraint:
            case SketchEntityKind.Curve:
            case SketchEntityKind.Dimension:
            case SketchEntityKind.Point:
            case SketchEntityKind.Profile:
            case SketchEntityKind.SketchState:
                return null;
        }
    }
}
