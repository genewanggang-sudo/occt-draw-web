import type { DisplayModel, DisplayObject } from './types';

export function createDisplayModel(
    id: string,
    name: string,
    objects: readonly DisplayObject[],
): DisplayModel {
    return {
        id,
        name,
        objects,
    };
}
