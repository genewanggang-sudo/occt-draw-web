import type { CadObject } from '@occt-draw/core';

interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly selectedObjects: readonly CadObject[];
}

export function InspectorPanel({ activeCommandLabel, selectedObjects }: InspectorPanelProps) {
    const selectedObject = selectedObjects[0] ?? null;

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
                <strong>{selectedObject ? selectedObject.name : '未选择对象'}</strong>
            </div>
            {selectedObject ? (
                <>
                    <div className="cad-workbench__inspector-section">
                        <span className="cad-workbench__inspector-label">对象类型</span>
                        <strong>{getObjectKindLabel(selectedObject.kind)}</strong>
                    </div>
                    <div className="cad-workbench__inspector-section">
                        <span className="cad-workbench__inspector-label">可见性</span>
                        <strong>{selectedObject.visible ? '可见' : '隐藏'}</strong>
                    </div>
                </>
            ) : (
                <div className="cad-workbench__empty-note">
                    后续命令参数、草图属性和特征编辑将在这里展开。
                </div>
            )}
        </aside>
    );
}

function getObjectKindLabel(kind: CadObject['kind']): string {
    if (kind === 'debug-cube') {
        return '调试立方体';
    }

    if (kind === 'reference-axis') {
        return '坐标轴';
    }

    return '基准网格';
}
