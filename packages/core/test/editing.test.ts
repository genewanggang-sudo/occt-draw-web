import {
    DocumentSession,
    ModelChangeApplierRegistry,
    ModelChangeSet,
    ModelChangeSetBuilder,
    Transaction,
    createRequestExecution,
    type ModelElementChangeTarget,
    type ModelPropertyChangeTarget,
    type ModelRef,
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
