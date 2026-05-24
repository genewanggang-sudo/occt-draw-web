import type { ModelElement } from './base';
import type { ModelRef } from './refs';
import { createModelRefKey } from './refs';

export interface ModelRefResolver {
    find(ref: ModelRef): ModelElement | null;
    has(ref: ModelRef): boolean;
    require(ref: ModelRef): ModelElement;
}

export class ModelRefIndex implements ModelRefResolver {
    private readonly objects: ReadonlyMap<string, ModelElement>;

    constructor(objects: readonly ModelElement[] = []) {
        this.objects = new Map(
            objects.map((object) => [createModelRefKey(object.toRef()), object]),
        );
    }

    public add(object: ModelElement): ModelRefIndex {
        return new ModelRefIndex([...this.objects.values(), object]);
    }

    public find(ref: ModelRef): ModelElement | null {
        const object = this.objects.get(createModelRefKey(ref)) ?? null;

        return object?.modelType === ref.kind ? object : null;
    }

    public has(ref: ModelRef): boolean {
        return this.find(ref) !== null;
    }

    public require(ref: ModelRef): ModelElement {
        const object = this.find(ref);

        if (!object) {
            throw new Error(`Missing model ref "${ref.kind}:${ref.id}".`);
        }

        return object;
    }

    public static fromObjects(objects: readonly ModelElement[]): ModelRefIndex {
        return new ModelRefIndex(objects);
    }
}
