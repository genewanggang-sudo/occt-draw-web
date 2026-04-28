import type { CadDocument, CadObject, PartStudio } from '@occt-draw/core';
import type { Sketch, SketchId } from '@occt-draw/sketch';

interface ModelTreePanelProps {
    readonly document: CadDocument;
    readonly onSelectObject: (objectId: string) => void;
    readonly partStudio: PartStudio;
    readonly selectedObjectIds: readonly string[];
    readonly sketchesById: Readonly<Record<SketchId, Sketch>>;
}

export function ModelTreePanel({
    document,
    onSelectObject,
    partStudio,
    selectedObjectIds,
    sketchesById,
}: ModelTreePanelProps) {
    const referenceObjects = partStudio.objects.filter(isReferenceObject);
    const modelObjects = partStudio.objects.filter((object) => !isReferenceObject(object));

    return (
        <aside className="cad-workbench__side-panel" aria-label="模型树">
            <div className="cad-workbench__panel-header">
                <span>模型树</span>
            </div>
            <div className="cad-workbench__tree">
                <div className="cad-workbench__tree-node cad-workbench__tree-node--root">
                    {document.name}
                </div>
                <div className="cad-workbench__tree-node cad-workbench__tree-node--studio">
                    {partStudio.name}
                </div>
                <div className="cad-workbench__tree-group">基准</div>
                {referenceObjects.map((object) => (
                    <ObjectTreeNode
                        key={object.id}
                        object={object}
                        selected={selectedObjectIds.includes(object.id)}
                        onSelectObject={onSelectObject}
                    />
                ))}
                <div className="cad-workbench__tree-group">对象</div>
                {modelObjects.length > 0 ? (
                    modelObjects.map((object) => (
                        <ObjectTreeNode
                            key={object.id}
                            object={object}
                            selected={selectedObjectIds.includes(object.id)}
                            onSelectObject={onSelectObject}
                        />
                    ))
                ) : (
                    <div className="cad-workbench__empty-note">暂无对象</div>
                )}
                <div className="cad-workbench__tree-group">特征</div>
                {partStudio.features.length > 0 ? (
                    partStudio.features.map((feature) => {
                        const sketch = feature.payloadRef
                            ? (sketchesById[feature.payloadRef] ?? null)
                            : null;

                        return (
                            <div key={feature.id} className="cad-workbench__tree-node">
                                <span className="cad-workbench__tree-dot" />
                                <span>{sketch?.name ?? feature.name}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="cad-workbench__empty-note">暂无特征</div>
                )}
            </div>
        </aside>
    );
}

function ObjectTreeNode({
    object,
    onSelectObject,
    selected,
}: {
    readonly object: CadObject;
    readonly onSelectObject: (objectId: string) => void;
    readonly selected: boolean;
}) {
    return (
        <div
            aria-pressed={selected}
            className={getObjectNodeClassName(selected)}
            role="button"
            tabIndex={0}
            onClick={() => {
                onSelectObject(object.id);
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectObject(object.id);
                }
            }}
        >
            <span className="cad-workbench__tree-dot" />
            <span>{object.name}</span>
        </div>
    );
}

function isReferenceObject(object: CadObject): boolean {
    return (
        object.kind === 'reference-axis' ||
        object.kind === 'reference-grid' ||
        object.kind === 'reference-plane'
    );
}

function getObjectNodeClassName(selected: boolean): string {
    if (selected) {
        return 'cad-workbench__tree-node cad-workbench__tree-node--selected';
    }

    return 'cad-workbench__tree-node';
}
