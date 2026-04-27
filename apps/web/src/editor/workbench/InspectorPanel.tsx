import type { CadObject, SelectionTarget, SelectionTargetKind } from '@occt-draw/core';
import type { CommandSession, CommandStatus } from '../commands/commandTypes';

interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly commandSession: CommandSession;
    readonly selectedObjects: readonly CadObject[];
    readonly selectedTarget: SelectionTarget | null;
}

export function InspectorPanel({
    activeCommandLabel,
    commandSession,
    selectedObjects,
    selectedTarget,
}: InspectorPanelProps) {
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
                <span className="cad-workbench__inspector-label">命令状态</span>
                <strong>{getCommandStatusLabel(commandSession.status)}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">命令说明</span>
                <strong>{commandSession.message}</strong>
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
                        <span className="cad-workbench__inspector-label">拾取目标</span>
                        <strong>
                            {selectedTarget
                                ? getPickTargetKindLabel(selectedTarget.targetKind)
                                : '对象'}
                        </strong>
                    </div>
                    <div className="cad-workbench__inspector-section">
                        <span className="cad-workbench__inspector-label">Primitive ID</span>
                        <strong>{selectedTarget?.primitiveId ?? '-'}</strong>
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

function getPickTargetKindLabel(kind: SelectionTargetKind): string {
    if (kind === 'edge') {
        return '边';
    }

    if (kind === 'face') {
        return '面';
    }

    if (kind === 'vertex') {
        return '顶点';
    }

    return '对象';
}

function getCommandStatusLabel(status: CommandStatus): string {
    if (status === 'blocked') {
        return '不可用';
    }

    if (status === 'cancelled') {
        return '已取消';
    }

    if (status === 'completed') {
        return '已完成';
    }

    if (status === 'running') {
        return '运行中';
    }

    return '空闲';
}
