import type { CadObject, PartStudio } from '@occt-draw/core';
import { createVector3 } from '@occt-draw/math';
import { createSceneDocument } from './sceneDocument';
import type { SceneDocument, SceneObject } from './types';

export class SceneObjectMapper {
    fromPartStudio(partStudio: PartStudio): SceneDocument {
        return createSceneDocument(
            partStudio.id,
            partStudio.name,
            partStudio.objects.map((object) => this.toSceneObject(object)),
        );
    }

    toSceneObject(object: CadObject): SceneObject {
        if (object.kind === 'reference-grid') {
            return {
                id: object.id,
                kind: 'grid',
                name: object.name,
                visible: object.visible,
                divisions: object.divisions,
                size: object.size,
            };
        }

        if (object.kind === 'reference-axis') {
            return {
                id: object.id,
                kind: 'axis',
                name: object.name,
                visible: object.visible,
                length: object.length,
            };
        }

        return {
            id: object.id,
            kind: 'cube-wireframe',
            name: object.name,
            visible: object.visible,
            center: createVector3(object.center.x, object.center.y, object.center.z),
            size: object.size,
        };
    }
}

export function createSceneDocumentFromPartStudio(partStudio: PartStudio): SceneDocument {
    return new SceneObjectMapper().fromPartStudio(partStudio);
}
