interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly selectedObjectCount: number;
}

export function InspectorPanel({ activeCommandLabel, selectedObjectCount }: InspectorPanelProps) {
    return (
        <aside className="cad-workbench__side-panel" aria-label="属性面板">
            <div className="cad-workbench__panel-header">
                <span>属性</span>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">当前命令</span>
                <strong>{activeCommandLabel}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">选择</span>
                <strong>
                    {selectedObjectCount > 0
                        ? `${selectedObjectCount.toString()} 个对象`
                        : '未选择对象'}
                </strong>
            </div>
            <div className="cad-workbench__empty-note">
                后续命令参数、草图属性和特征编辑将在这里展开。
            </div>
        </aside>
    );
}
