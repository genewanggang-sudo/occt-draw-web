import { useState } from 'react';
import type { ModelTreeViewModel } from '@occt-draw/editor';

interface ModelTreePanelProps {
    readonly modelTree: ModelTreeViewModel;
    readonly onEditSketchFeature: (sketchFeatureId: string) => void;
    readonly onSelectObject: (objectId: string) => void;
}

export function ModelTreePanel({
    modelTree,
    onEditSketchFeature,
    onSelectObject,
}: ModelTreePanelProps) {
    const [filterText, setFilterText] = useState('');
    const normalizedFilter = normalizeFilterText(filterText);
    const visibleDefaultGeometryItems = modelTree.defaultGeometryItems.filter((item) =>
        matchesFilter([item.label, item.type === 'origin' ? '原点' : '基准面'], normalizedFilter),
    );
    const visibleFeatures = modelTree.features.filter((feature) =>
        matchesFilter([feature.label, feature.type], normalizedFilter),
    );

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
                    <div className="cad-feature-tree__section-title">
                        特征 ({modelTree.featureCount})
                    </div>
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
                                    onSelectObject={onSelectObject}
                                />
                            ))}
                        </div>
                    </div>
                    {visibleFeatures.map((feature) => (
                        <FeatureNode
                            feature={feature}
                            key={feature.id}
                            onEditSketchFeature={onEditSketchFeature}
                        />
                    ))}
                </section>
                <section className="cad-feature-tree__parts">
                    <div className="cad-feature-tree__section-title">零件数 (0)</div>
                </section>
            </div>
        </aside>
    );
}

function FeatureNode({
    feature,
    onEditSketchFeature,
}: {
    readonly feature: ModelTreeViewModel['features'][number];
    readonly onEditSketchFeature: (sketchFeatureId: string) => void;
}) {
    const className = feature.active
        ? 'cad-feature-tree__node cad-feature-tree__node--active-sketch'
        : 'cad-feature-tree__node';
    const content = (
        <>
            <span
                className="cad-feature-tree__node-icon cad-feature-tree__node-icon--feature"
                aria-hidden="true"
            />
            <span>{feature.label}</span>
        </>
    );

    if (feature.type !== 'sketch') {
        return <div className={className}>{content}</div>;
    }

    return (
        <button
            type="button"
            aria-label={`编辑 ${feature.label}`}
            aria-current={feature.active ? 'true' : undefined}
            className={className}
            onClick={() => {
                onEditSketchFeature(feature.id);
            }}
        >
            {content}
        </button>
    );
}

function DefaultGeometryNode({
    item,
    onSelectObject,
}: {
    readonly item: ModelTreeViewModel['defaultGeometryItems'][number];
    readonly onSelectObject: (objectId: string) => void;
}) {
    const objectId = item.objectId;
    const className = item.selected
        ? 'cad-feature-tree__node cad-feature-tree__node--selected'
        : 'cad-feature-tree__node';

    if (!objectId) {
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
            aria-pressed={item.selected}
            className={className}
            onClick={() => {
                onSelectObject(objectId);
            }}
        >
            <DefaultGeometryIcon type={item.type} />
            <span>{item.label}</span>
        </button>
    );
}

function DefaultGeometryIcon({
    type,
}: {
    readonly type: ModelTreeViewModel['defaultGeometryItems'][number]['type'];
}) {
    return (
        <span
            className={`cad-feature-tree__node-icon cad-feature-tree__node-icon--${type}`}
            aria-hidden="true"
        />
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
