import { useState } from 'react';
import type {
    CadDocument,
    CadObject,
    PartStudio,
    ReferenceOriginObject,
    ReferencePlaneKind,
    ReferencePlaneObject,
} from '@occt-draw/core';
import type { Sketch, SketchId } from '@occt-draw/sketch';

interface ModelTreePanelProps {
    readonly document: CadDocument;
    readonly onSelectObject: (objectId: string) => void;
    readonly partStudio: PartStudio;
    readonly selectedObjectIds: readonly string[];
    readonly sketchesById: Readonly<Record<SketchId, Sketch>>;
}

interface DefaultGeometryItem {
    readonly id: string;
    readonly label: string;
    readonly object: CadObject | null;
    readonly type: 'origin' | 'plane';
}

export function ModelTreePanel({
    onSelectObject,
    partStudio,
    selectedObjectIds,
    sketchesById,
}: ModelTreePanelProps) {
    const [filterText, setFilterText] = useState('');
    const defaultGeometryItems = createDefaultGeometryItems(partStudio);
    const featureCount = defaultGeometryItems.length + partStudio.features.length;
    const normalizedFilter = normalizeFilterText(filterText);
    const visibleDefaultGeometryItems = defaultGeometryItems.filter((item) =>
        matchesFilter([item.label, item.type === 'origin' ? '原点' : '基准面'], normalizedFilter),
    );
    const visibleFeatures = partStudio.features.filter((feature) => {
        const sketch = feature.payloadRef ? (sketchesById[feature.payloadRef] ?? null) : null;

        return matchesFilter([sketch?.name ?? feature.name, feature.type], normalizedFilter);
    });

    return (
        <aside
            className="cad-workbench__side-panel cad-workbench__feature-tree-panel"
            aria-label="特征树"
        >
            <div className="cad-feature-tree__filter">
                <span className="cad-feature-tree__filter-icon" aria-hidden="true">
                    ⌕
                </span>
                <input
                    className="cad-feature-tree__filter-input"
                    type="search"
                    value={filterText}
                    placeholder="按名称或类型筛选"
                    aria-label="按名称或类型筛选"
                    onChange={(event) => {
                        setFilterText(event.currentTarget.value);
                    }}
                />
            </div>
            <div className="cad-feature-tree">
                <section className="cad-feature-tree__section">
                    <div className="cad-feature-tree__section-title">特征 ({featureCount})</div>
                    <div className="cad-feature-tree__group">
                        <div className="cad-feature-tree__group-title">
                            <span className="cad-feature-tree__chevron" aria-hidden="true">
                                ▾
                            </span>
                            <span>默认几何元</span>
                        </div>
                        <div className="cad-feature-tree__children">
                            {visibleDefaultGeometryItems.map((item) => (
                                <DefaultGeometryNode
                                    key={item.id}
                                    item={item}
                                    selected={
                                        item.object
                                            ? selectedObjectIds.includes(item.object.id)
                                            : false
                                    }
                                    onSelectObject={onSelectObject}
                                />
                            ))}
                        </div>
                    </div>
                    {visibleFeatures.map((feature) => {
                        const sketch = feature.payloadRef
                            ? (sketchesById[feature.payloadRef] ?? null)
                            : null;

                        return (
                            <div key={feature.id} className="cad-feature-tree__node">
                                <span
                                    className="cad-feature-tree__node-icon cad-feature-tree__node-icon--feature"
                                    aria-hidden="true"
                                />
                                <span>{sketch?.name ?? feature.name}</span>
                            </div>
                        );
                    })}
                </section>
                <section className="cad-feature-tree__parts">
                    <div className="cad-feature-tree__section-title">零件数 (0)</div>
                </section>
            </div>
        </aside>
    );
}

function DefaultGeometryNode({
    item,
    onSelectObject,
    selected,
}: {
    readonly item: DefaultGeometryItem;
    readonly onSelectObject: (objectId: string) => void;
    readonly selected: boolean;
}) {
    const className = selected
        ? 'cad-feature-tree__node cad-feature-tree__node--selected'
        : 'cad-feature-tree__node';
    const object = item.object;

    if (!object) {
        return (
            <div className={`${className} cad-feature-tree__node--muted`}>
                <DefaultGeometryIcon type={item.type} />
                <span>{item.label}</span>
            </div>
        );
    }

    return (
        <button
            type="button"
            aria-pressed={selected}
            className={className}
            onClick={() => {
                onSelectObject(object.id);
            }}
        >
            <DefaultGeometryIcon type={item.type} />
            <span>{item.label}</span>
        </button>
    );
}

function DefaultGeometryIcon({ type }: { readonly type: DefaultGeometryItem['type'] }) {
    return (
        <span
            className={`cad-feature-tree__node-icon cad-feature-tree__node-icon--${type}`}
            aria-hidden="true"
        />
    );
}

function createDefaultGeometryItems(partStudio: PartStudio): readonly DefaultGeometryItem[] {
    return [
        { id: 'origin', label: '原点', object: findOrigin(partStudio.objects), type: 'origin' },
        {
            id: 'top',
            label: '上',
            object: findPlaneByKind(partStudio.objects, 'xy'),
            type: 'plane',
        },
        {
            id: 'front',
            label: '前',
            object: findPlaneByKind(partStudio.objects, 'zx'),
            type: 'plane',
        },
        {
            id: 'right',
            label: '右',
            object: findPlaneByKind(partStudio.objects, 'yz'),
            type: 'plane',
        },
    ];
}

function findOrigin(objects: readonly CadObject[]): ReferenceOriginObject | null {
    return (
        objects.find(
            (object): object is ReferenceOriginObject => object.kind === 'reference-origin',
        ) ?? null
    );
}

function findPlaneByKind(
    objects: readonly CadObject[],
    planeKind: ReferencePlaneKind,
): ReferencePlaneObject | null {
    return (
        objects.find(
            (object): object is ReferencePlaneObject =>
                object.kind === 'reference-plane' && object.planeKind === planeKind,
        ) ?? null
    );
}

function matchesFilter(values: readonly string[], normalizedFilter: string): boolean {
    if (normalizedFilter.length === 0) {
        return true;
    }

    return values.some((value) => normalizeFilterText(value).includes(normalizedFilter));
}

function normalizeFilterText(value: string): string {
    return value.trim().toLocaleLowerCase();
}
