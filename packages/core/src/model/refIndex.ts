import type { ModelObject } from './base';
import type { ModelRef } from './refs';
import { createModelRefKey } from './refs';

export interface ModelRefResolver {
    find(ref: ModelRef): ModelObject | null;
    has(ref: ModelRef): boolean;
    require(ref: ModelRef): ModelObject;
}

export class ModelRefIndex implements ModelRefResolver {
    private readonly objects: ReadonlyMap<string, ModelObject>;

    constructor(objects: readonly ModelObject[] = []) {
        this.objects = new Map(
            objects.map((object) => [createModelRefKey(object.toRef()), object]),
        );
    }

    public add(object: ModelObject): ModelRefIndex {
        return new ModelRefIndex([...this.objects.values(), object]);
    }

    public find(ref: ModelRef): ModelObject | null {
        const object = this.objects.get(createModelRefKey(ref)) ?? null;

        return object?.modelType === ref.kind ? object : null;
    }

    public has(ref: ModelRef): boolean {
        return this.find(ref) !== null;
    }

    public require(ref: ModelRef): ModelObject {
        const object = this.find(ref);

        if (!object) {
            throw new Error(`Missing model ref "${ref.kind}:${ref.id}".`);
        }

        return object;
    }

    public static fromObjects(objects: readonly ModelObject[]): ModelRefIndex {
        return new ModelRefIndex(objects);
    }
}
