import type { CanvasPickRef } from '@occt-draw/canvas';
import { SketchEntityKind, type SketchEntityRef } from '@occt-draw/sketch';
import {
    DOMAIN_METADATA_KEY,
    ENTITY_KIND_METADATA_KEY,
    FEATURE_ID_METADATA_KEY,
    SKETCH_ENTITY_REF_METADATA_KEY,
} from './canvasAdapterMetadata';

export class SketchPickRefAdapter {
    public createSketchPickRef(featureId: string, ref: SketchEntityRef): CanvasPickRef {
        const entityKind = this.getPickableEntityKind(ref);
        const metadata = new Map<string, unknown>([
            [DOMAIN_METADATA_KEY, 'sketch'],
            [FEATURE_ID_METADATA_KEY, featureId],
            [SKETCH_ENTITY_REF_METADATA_KEY, ref],
        ]);

        if (entityKind) {
            metadata.set(ENTITY_KIND_METADATA_KEY, entityKind);
        }

        return {
            id: `${ref.sketchId}:${ref.entityId}`,
            ...(entityKind ? { kind: entityKind } : {}),
            metadata,
        };
    }

    public getSketchEntityId(ref: SketchEntityRef): string {
        return ref.entityId;
    }

    private getPickableEntityKind(ref: SketchEntityRef): string | null {
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
