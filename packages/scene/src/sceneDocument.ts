import type { SceneDocument, SceneObject } from './types';

export function createSceneDocument(
    id: string,
    name: string,
    objects: readonly SceneObject[],
): SceneDocument {
    return {
        id,
        name,
        objects,
    };
}
