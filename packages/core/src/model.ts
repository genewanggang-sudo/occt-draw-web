import type { DocumentId } from './ids';

export interface ModelEntityInput<TId extends string = string> {
    readonly id: TId;
    readonly metadata?: ReadonlyMap<string, unknown> | null;
    readonly name: string;
}

export interface RevisionedModelEntityInput<
    TId extends string = string,
> extends ModelEntityInput<TId> {
    readonly revision?: number;
}

export interface IdentifiedModelEntity<TId extends string = string> {
    readonly id: TId;
}

export interface NamedModelEntity<TId extends string = string> extends IdentifiedModelEntity<TId> {
    readonly name: string;
}

export interface RevisionedModelEntity<TId extends string = string> extends NamedModelEntity<TId> {
    readonly revision: number;
}

export abstract class BaseModelEntity<
    TId extends string = string,
> implements NamedModelEntity<TId> {
    public readonly id: TId;
    public readonly metadata: ReadonlyMap<string, unknown>;
    public readonly name: string;

    protected constructor(input: ModelEntityInput<TId>) {
        this.id = input.id;
        this.metadata = new Map(input.metadata ?? []);
        this.name = input.name;
    }
}

export abstract class BaseRevisionedModelEntity<TId extends string = string>
    extends BaseModelEntity<TId>
    implements RevisionedModelEntity<TId>
{
    public readonly revision: number;

    protected constructor(input: RevisionedModelEntityInput<TId>) {
        super(input);
        this.revision = input.revision ?? 0;
    }
}

export abstract class BaseDocumentModel<
    TDocumentId extends string = DocumentId,
> extends BaseRevisionedModelEntity<TDocumentId> {
    protected constructor(input: RevisionedModelEntityInput<TDocumentId>) {
        super(input);
    }
}
