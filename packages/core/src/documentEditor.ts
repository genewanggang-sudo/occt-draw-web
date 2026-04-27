import { CadDocument, PartStudio } from './document';
import type { Feature } from './features';
import type { PartStudioId } from './ids';

export type OperationId = string;
export type DocumentEdit = DocumentTransaction | TransactionGroup;

export abstract class DocumentOperation {
    abstract readonly id: OperationId;
    abstract readonly label: string;
    abstract apply(document: CadDocument): CadDocument;
}

export class AppendFeatureOperation extends DocumentOperation {
    readonly id: OperationId;
    readonly label: string;
    readonly feature: Feature;
    readonly partStudioId: PartStudioId;

    constructor(input: {
        readonly feature: Feature;
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudioId: PartStudioId;
    }) {
        super();
        this.id = input.id ?? createOperationId('append-feature', input.feature.id);
        this.label = input.label ?? `追加特征：${input.feature.name}`;
        this.feature = input.feature;
        this.partStudioId = input.partStudioId;
    }

    apply(document: CadDocument): CadDocument {
        return replacePartStudio(
            document,
            appendFeatureToPartStudio(
                findPartStudioOrThrow(document, this.partStudioId),
                this.feature,
            ),
        );
    }
}

export class ReplaceActivePartStudioOperation extends DocumentOperation {
    readonly activePartStudioId: PartStudioId;
    readonly id: OperationId;
    readonly label: string;

    constructor(input: {
        readonly activePartStudioId: PartStudioId;
        readonly id?: OperationId;
        readonly label?: string;
    }) {
        super();
        this.activePartStudioId = input.activePartStudioId;
        this.id =
            input.id ?? createOperationId('replace-active-part-studio', input.activePartStudioId);
        this.label = input.label ?? '切换零件工作室';
    }

    apply(document: CadDocument): CadDocument {
        return new CadDocument({
            activePartStudioId: this.activePartStudioId,
            id: document.id,
            name: document.name,
            partStudios: document.partStudios,
        });
    }
}

export class ReplacePartStudioOperation extends DocumentOperation {
    readonly id: OperationId;
    readonly label: string;
    readonly partStudio: PartStudio;

    constructor(input: {
        readonly id?: OperationId;
        readonly label?: string;
        readonly partStudio: PartStudio;
    }) {
        super();
        this.id = input.id ?? createOperationId('replace-part-studio', input.partStudio.id);
        this.label = input.label ?? `替换零件工作室：${input.partStudio.name}`;
        this.partStudio = input.partStudio;
    }

    apply(document: CadDocument): CadDocument {
        return replacePartStudio(document, this.partStudio);
    }
}

export class DocumentTransaction {
    readonly label: string;
    readonly operations: readonly DocumentOperation[];

    constructor(input: {
        readonly label: string;
        readonly operations: readonly DocumentOperation[];
    }) {
        this.label = input.label;
        this.operations = [...input.operations];
    }

    apply(document: CadDocument): CadDocument {
        return this.operations.reduce(
            (currentDocument, operation) => operation.apply(currentDocument),
            document,
        );
    }
}

export class TransactionGroup {
    readonly label: string;
    readonly transactions: readonly DocumentTransaction[];

    constructor(input: {
        readonly label: string;
        readonly transactions: readonly DocumentTransaction[];
    }) {
        this.label = input.label;
        this.transactions = [...input.transactions];
    }

    apply(document: CadDocument): CadDocument {
        return this.transactions.reduce(
            (currentDocument, transaction) => transaction.apply(currentDocument),
            document,
        );
    }
}

export class DocumentEditor {
    private readonly document: CadDocument;

    constructor(document: CadDocument) {
        this.document = document;
    }

    apply(edit: DocumentEdit): CadDocument {
        return edit.apply(this.document);
    }
}

export function editCadDocument(document: CadDocument, edit: DocumentEdit): CadDocument {
    return new DocumentEditor(document).apply(edit);
}

function appendFeatureToPartStudio(partStudio: PartStudio, feature: Feature): PartStudio {
    return new PartStudio({
        features: [...partStudio.features, feature],
        id: partStudio.id,
        name: partStudio.name,
        objects: partStudio.objects,
    });
}

function replacePartStudio(document: CadDocument, partStudio: PartStudio): CadDocument {
    return new CadDocument({
        activePartStudioId: document.activePartStudioId,
        id: document.id,
        name: document.name,
        partStudios: document.partStudios.map((current) =>
            current.id === partStudio.id ? partStudio : current,
        ),
    });
}

function findPartStudioOrThrow(document: CadDocument, partStudioId: PartStudioId): PartStudio {
    const partStudio = document.partStudios.find((current) => current.id === partStudioId);

    if (!partStudio) {
        throw new Error(`文档编辑失败：找不到 PartStudio ${partStudioId}`);
    }

    return partStudio;
}

function createOperationId(prefix: string, entityId: string): OperationId {
    return `${prefix}:${entityId}`;
}
