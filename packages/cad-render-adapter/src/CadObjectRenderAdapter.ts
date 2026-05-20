import type { CadObject, ReferenceOriginObject, ReferencePlaneObject } from '@occt-draw/cad-model';
import type {
    CadRenderObject,
    CadRenderReferenceOrigin,
    CadRenderReferencePlane,
} from '@occt-draw/cad-rendering';

export class CadObjectRenderAdapter {
    public createObject(object: CadObject): CadRenderObject {
        if (object.kind === 'reference-origin') {
            return this.createReferenceOrigin(object);
        }

        return this.createReferencePlane(object);
    }

    public createReferenceOrigin(object: ReferenceOriginObject): CadRenderReferenceOrigin {
        return {
            id: object.id,
            kind: 'reference-origin',
            name: object.name,
            position: object.position,
            visible: object.visible,
        };
    }

    public createReferencePlane(object: ReferencePlaneObject): CadRenderReferencePlane {
        return {
            id: object.id,
            kind: 'reference-plane',
            name: object.name,
            normal: object.normal,
            origin: object.origin,
            planeKind: object.planeKind,
            size: object.size,
            visible: object.visible,
            xAxis: object.xAxis,
        };
    }
}
