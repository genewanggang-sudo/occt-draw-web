import {
    DocumentEditor,
    DocumentSession,
    ModelChangeApplierRegistry,
    ModelChangeSet,
    ModelChangeSetBuilder,
    Transaction,
    createRequestExecution,
    type DocumentMutationRuntime,
    type DocumentRequest,
    type DocumentWriteContext,
    type ModelElementChangeTarget,
    type ModelPropertyChangeTarget,
    type ModelRef,
    type MutationScope,
    type Request,
} from '../src';

interface TestItem {
    readonly id: string;
    readonly name: string;
}

interface TestDocument {
    readonly items: Readonly<Record<string, TestItem>>;
}

type TestRef = ModelRef & {
    readonly kind: 'test.item';
};

const itemTarget: ModelElementChangeTarget<TestDocument, TestRef, TestItem> = {
    targetKind: 'test.item',
    add: (document, ref, value) => ({
        ...document,
        items: {
            ...document.items,
            [ref.id]: value,
        },
    }),
    remove: (document, ref) => {
        const { [ref.id]: _removed, ...items } = document.items;

        return {
            ...document,
            items,
        };
    },
};

const itemPropertyTarget: ModelPropertyChangeTarget<TestDocument, TestRef, string> = {
    targetKind: 'test.item.property',
    set: (document, ref, propertyPath, value) => {
        const item = document.items[ref.id];

        if (!item || propertyPath.join('.') !== 'name') {
            return document;
        }

        return {
            ...document,
            items: {
                ...document.items,
                [ref.id]: {
                    ...item,
                    name: value,
                },
            },
        };
    },
};

const ref: TestRef = {
    id: 'item:1',
    kind: 'test.item',
};

run('ModelChangeSet cancels add followed by delete for the same ref', () => {
    const builder = new ModelChangeSetBuilder<TestDocument>();
    const item = { id: ref.id, name: 'Created' };

    builder.recordAdd({
        id: 'add:item:1',
        label: 'Add item',
        ref,
        target: itemTarget,
        value: item,
    });
    builder.recordDelete({
        id: 'remove:item:1',
        label: 'Remove item',
        ref,
        target: itemTarget,
        value: item,
    });

    expectTrue(builder.toChangeSet().isEmpty(), 'expected add/delete to cancel');
});

run('ModelChangeSet merges updates with initial before and final after', () => {
    const builder = new ModelChangeSetBuilder<TestDocument>();

    builder.recordUpdate({
        after: 'Middle',
        before: 'Initial',
        id: 'set:item:1:name',
        label: 'Rename item',
        propertyPath: ['name'],
        ref,
        target: itemPropertyTarget,
    });
    builder.recordUpdate({
        after: 'Final',
        before: 'Middle',
        id: 'set:item:1:name:again',
        label: 'Rename item again',
        propertyPath: ['name'],
        ref,
        target: itemPropertyTarget,
    });

    const change = builder.toChangeSet().snapshot().changes[0];

    expectEqual(change?.kind, 'update', 'expected update snapshot');

    if (change?.kind !== 'update') {
        throw new Error('Expected update change.');
    }

    expectEqual(change.properties[0]?.before, 'Initial', 'expected initial before value');
    expectEqual(change.properties[0]?.after, 'Final', 'expected final after value');
    expectEqual(change.targetKind, 'test.item.property', 'expected serializable target kind');
});

run('ModelChangeSet update revert restores the before value', () => {
    const changeSet = createRenameChangeSet('Initial', 'Final');
    const original: TestDocument = {
        items: {
            [ref.id]: { id: ref.id, name: 'Initial' },
        },
    };

    const applied = changeSet.apply(original);
    const reverted = changeSet.revert(applied);

    expectEqual(applied.items[ref.id]?.name, 'Final', 'expected applied after value');
    expectEqual(reverted.items[ref.id]?.name, 'Initial', 'expected reverted before value');
});

run('ModelChangeApplierRegistry applies and reverts serializable change sets', () => {
    const registry = new ModelChangeApplierRegistry<TestDocument>();
    const original: TestDocument = {
        items: {
            [ref.id]: { id: ref.id, name: 'Initial' },
        },
    };

    registry.registerElement(itemTarget.targetKind, itemTarget);
    registry.registerProperty(itemPropertyTarget.targetKind, itemPropertyTarget);

    const snapshot = createRenameChangeSet('Initial', 'Final').toSerializable();
    const applied = registry.apply(original, snapshot);
    const reverted = registry.revert(applied, snapshot);

    expectEqual(applied.items[ref.id]?.name, 'Final', 'expected registry applied value');
    expectEqual(reverted.items[ref.id]?.name, 'Initial', 'expected registry reverted value');
});

run('Transaction.map applies an inner change set to an outer document', () => {
    interface OuterDocument {
        readonly inner: TestDocument;
        readonly untouched: string;
    }

    const transaction = new Transaction({
        changeSet: createRenameChangeSet('Initial', 'Final'),
        id: 'rename:item:1',
        label: 'Rename item',
    }).map<OuterDocument>({
        get: (outer) => outer.inner,
        replace: (outer, inner) => ({
            ...outer,
            inner,
        }),
    });
    const original: OuterDocument = {
        inner: {
            items: {
                [ref.id]: { id: ref.id, name: 'Initial' },
            },
        },
        untouched: 'kept',
    };

    const applied = transaction.apply(original);

    expectEqual(applied.inner.items[ref.id]?.name, 'Final', 'expected mapped inner update');
    expectEqual(applied.untouched, 'kept', 'expected outer data to be preserved');
    expectEqual(
        transaction.snapshot().changeSet.changes[0]?.targetKind,
        'test.item.property',
        'expected mapped transaction to keep target kind',
    );
});

run('DocumentSession does not record empty transactions in history', () => {
    const document: TestDocument = { items: {} };
    const session = new DocumentSession(document);
    const request: Request<TestDocument, string> = {
        label: 'Noop',
        execute: () =>
            createRequestExecution({
                result: 'noop',
                transaction: new Transaction({
                    changeSet: ModelChangeSet.empty<TestDocument>(),
                    id: 'noop',
                    label: 'Noop',
                }),
            }),
    };

    const result = session.execute(request);
    const snapshot = session.getSnapshot();

    expectEqual(result.execution.result, 'noop', 'expected request result');
    expectEqual(result.recorded, false, 'expected empty transaction not to be recorded');
    expectEqual(result.record, null, 'expected no history record');
    expectEqual(result.transaction, null, 'expected no applied transaction');
    expectEqual(snapshot.undoDepth, 0, 'expected empty history');
    expectEqual(
        contextDocumentId(result.document),
        contextDocumentId(document),
        'expected same document',
    );
});

run('DocumentEditor previews legacy requests without changing history', () => {
    const document: TestDocument = {
        items: {
            [ref.id]: { id: ref.id, name: 'Initial' },
        },
    };
    const editor = new DocumentEditor(document);

    const preview = editor.preview(createRenameRequest('Initial', 'Preview'));
    const snapshot = editor.getSnapshot();

    expectEqual(preview.result, 'Preview', 'expected preview request result');
    expectEqual(
        preview.workingDocument.items[ref.id]?.name,
        'Preview',
        'expected preview working document',
    );
    expectEqual(editor.document.items[ref.id]?.name, 'Initial', 'expected live document unchanged');
    expectEqual(snapshot.undoDepth, 0, 'expected preview not to record history');
});

run('DocumentEditor executes legacy requests and delegates undo redo', () => {
    const document: TestDocument = {
        items: {
            [ref.id]: { id: ref.id, name: 'Initial' },
        },
    };
    const editor = new DocumentEditor(document);

    const result = editor.execute(createRenameRequest('Initial', 'Final'));

    expectEqual(result.recorded, true, 'expected execute to record history');
    expectEqual(editor.document.items[ref.id]?.name, 'Final', 'expected live document update');
    expectEqual(editor.canUndo, true, 'expected editor to expose undo');

    editor.undo();
    expectEqual(editor.document.items[ref.id]?.name, 'Initial', 'expected undo through editor');

    editor.redo();
    expectEqual(editor.document.items[ref.id]?.name, 'Final', 'expected redo through editor');
});

run('DocumentEditor executes DocumentRequest through mutation runtime', () => {
    const document: TestDocument = {
        items: {
            [ref.id]: { id: ref.id, name: 'Initial' },
        },
    };
    const editor = new DocumentEditor({
        document,
        mutationRuntime: createTestMutationRuntime(),
    });
    const request: DocumentRequest<TestDocument, string, TestWriteContext> = {
        id: 'rename:item:1',
        label: 'Rename item',
        execute: (context) => {
            context.renameItem(ref, 'Final');

            return 'Final';
        },
    };

    const preview = editor.preview(request);

    expectEqual(preview.result, 'Final', 'expected preview result');
    expectEqual(preview.workingDocument.items[ref.id]?.name, 'Final', 'expected preview document');
    expectEqual(editor.document.items[ref.id]?.name, 'Initial', 'expected preview not to apply');
    expectEqual(editor.canUndo, false, 'expected preview not to record history');

    const result = editor.execute(request);

    expectEqual(result.recorded, true, 'expected execute to record generated transaction');
    expectEqual(editor.document.items[ref.id]?.name, 'Final', 'expected execute to apply');

    editor.undo();
    expectEqual(editor.document.items[ref.id]?.name, 'Initial', 'expected undo to revert');
});

function createRenameChangeSet(before: string, after: string): ModelChangeSet<TestDocument> {
    const builder = new ModelChangeSetBuilder<TestDocument>();

    builder.recordUpdate({
        after,
        before,
        id: 'set:item:1:name',
        label: 'Rename item',
        propertyPath: ['name'],
        ref,
        target: itemPropertyTarget,
    });

    return builder.toChangeSet();
}

interface TestWriteContext extends DocumentWriteContext<TestDocument> {
    renameItem(ref: TestRef, name: string): void;
}

function createTestMutationRuntime(): DocumentMutationRuntime<TestDocument, TestWriteContext> {
    return {
        begin: ({ document, id, label }) =>
            createTestMutationScope({
                document,
                id,
                label,
            }),
    };
}

function createTestMutationScope(input: {
    readonly document: TestDocument;
    readonly id: string;
    readonly label: string;
}): MutationScope<TestDocument, TestWriteContext> {
    const builder = new ModelChangeSetBuilder<TestDocument>();
    let discarded = false;
    const requireActive = () => {
        if (discarded) {
            throw new Error('Mutation scope was discarded.');
        }
    };

    return {
        context: {
            renameItem: (itemRef, name) => {
                requireActive();

                builder.recordUpdate({
                    after: name,
                    before: input.document.items[itemRef.id]?.name ?? '',
                    id: `set:${itemRef.id}:name`,
                    label: input.label,
                    propertyPath: ['name'],
                    ref: itemRef,
                    target: itemPropertyTarget,
                });
            },
        },
        get workingDocument() {
            return builder.toChangeSet().apply(input.document);
        },
        commit: () => {
            requireActive();

            return new Transaction({
                changeSet: builder.toChangeSet(),
                id: input.id,
                label: input.label,
            });
        },
        discard: () => {
            discarded = true;
        },
    };
}

function createRenameRequest(before: string, after: string): Request<TestDocument, string> {
    return {
        label: 'Rename item',
        execute: () =>
            createRequestExecution({
                result: after,
                transaction: new Transaction({
                    changeSet: createRenameChangeSet(before, after),
                    id: 'rename:item:1',
                    label: 'Rename item',
                }),
            }),
    };
}

function contextDocumentId(document: TestDocument): TestDocument {
    return document;
}

function run(name: string, test: () => void): void {
    test();
    console.log(`ok - ${name}`);
}

function expectTrue(value: boolean, message: string): void {
    if (!value) {
        throw new Error(message);
    }
}

function expectEqual<TValue>(actual: TValue, expected: TValue, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
    }
}
