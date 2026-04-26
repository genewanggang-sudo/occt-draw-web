import type { CadDocument, PartStudio } from '@occt-draw/core';

interface ModelTreePanelProps {
    readonly document: CadDocument;
    readonly partStudio: PartStudio;
}

export function ModelTreePanel({ document, partStudio }: ModelTreePanelProps) {
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
                <div className="cad-workbench__tree-group">对象</div>
                {partStudio.objects.map((object) => (
                    <div key={object.id} className="cad-workbench__tree-node">
                        <span className="cad-workbench__tree-dot" />
                        <span>{object.name}</span>
                    </div>
                ))}
                {partStudio.features.length > 0 ? (
                    <>
                        <div className="cad-workbench__tree-group">特征</div>
                        {partStudio.features.map((feature) => (
                            <div key={feature.id} className="cad-workbench__tree-node">
                                <span className="cad-workbench__tree-dot" />
                                <span>{feature.name}</span>
                            </div>
                        ))}
                    </>
                ) : (
                    <div className="cad-workbench__empty-note">暂无特征</div>
                )}
            </div>
        </aside>
    );
}
