export type ModelPropertyKey = string;
export type ModelPropertyPath = readonly ModelPropertyKey[];
export type ModelPropertyValue = boolean | null | number | object | string;

export interface ModelProperty<TValue extends ModelPropertyValue = ModelPropertyValue> {
    readonly key: ModelPropertyKey;
    readonly value: TValue;
}

export interface ModelPropertyDefinition<TValue extends ModelPropertyValue = ModelPropertyValue> {
    readonly defaultValue?: TValue | undefined;
    readonly key: ModelPropertyKey;
    readonly serialize?: ((value: TValue) => ModelPropertyValue) | undefined;
    readonly validate?: ((value: TValue) => void) | undefined;
}

export function defineModelProperty<TValue extends ModelPropertyValue = ModelPropertyValue>(
    definition: ModelPropertyDefinition<TValue>,
): ModelPropertyDefinition<TValue> {
    return definition;
}

export class ModelPropertyBag {
    private readonly properties: ReadonlyMap<ModelPropertyKey, ModelPropertyValue>;

    constructor(properties?: Iterable<readonly [ModelPropertyKey, ModelPropertyValue]>) {
        this.properties = new Map(properties ?? []);
    }

    public entries(): readonly (readonly [ModelPropertyKey, ModelPropertyValue])[] {
        return [...this.properties.entries()];
    }

    public find(key: ModelPropertyKey): ModelPropertyValue | null {
        return this.properties.get(key) ?? null;
    }

    public get<TValue extends ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
    ): ModelPropertyValue | null {
        const value = this.find(definition.key);

        return value ?? definition.defaultValue ?? null;
    }

    public has(key: ModelPropertyKey): boolean {
        return this.properties.has(key);
    }

    public remove(key: ModelPropertyKey): ModelPropertyBag {
        if (!this.properties.has(key)) {
            return this;
        }

        const next = new Map(this.properties);

        next.delete(key);

        return new ModelPropertyBag(next);
    }

    public require(key: ModelPropertyKey): ModelPropertyValue {
        const value = this.find(key);

        if (value === null) {
            throw new Error(`Missing model property "${key}".`);
        }

        return value;
    }

    public set(key: ModelPropertyKey, value: ModelPropertyValue): ModelPropertyBag {
        return new ModelPropertyBag([...this.properties, [key, value]]);
    }

    public setDefined<TValue extends ModelPropertyValue = ModelPropertyValue>(
        definition: ModelPropertyDefinition<TValue>,
        value: TValue,
    ): ModelPropertyBag {
        definition.validate?.(value);

        return this.set(definition.key, definition.serialize?.(value) ?? value);
    }

    public toReadonlyMap(): ReadonlyMap<ModelPropertyKey, ModelPropertyValue> {
        return new Map(this.properties);
    }
}
