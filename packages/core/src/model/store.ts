import type { IdentifiedModelElement } from './base';

export class ModelElementStore<
    TEntity extends IdentifiedModelElement<TId>,
    TId extends string = string,
> {
    private readonly entities: ReadonlyMap<TId, TEntity>;

    constructor(entities?: Iterable<readonly [TId, TEntity]>) {
        const emptyEntities: readonly (readonly [TId, TEntity])[] = [];

        this.entities = new Map(entities ?? emptyEntities);
    }

    public static fromEntities<
        TEntity extends IdentifiedModelElement<TId>,
        TId extends string = string,
    >(entities: readonly TEntity[]): ModelElementStore<TEntity, TId> {
        return new ModelElementStore(entities.map((entity) => [entity.id, entity]));
    }

    public find(id: TId): TEntity | null {
        return this.entities.get(id) ?? null;
    }

    public has(id: TId): boolean {
        return this.entities.has(id);
    }

    public list(): readonly TEntity[] {
        return [...this.entities.values()];
    }

    public remove(id: TId): ModelElementStore<TEntity, TId> {
        const next = new Map(this.entities);

        next.delete(id);

        return new ModelElementStore(next);
    }

    public set(entity: TEntity): ModelElementStore<TEntity, TId> {
        return new ModelElementStore([...this.entities, [entity.id, entity]]);
    }
}
