import type { CommandSession, CommandStatus, InspectorViewModel } from '@occt-draw/editor';

interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly commandSession: CommandSession;
    readonly inspector: InspectorViewModel;
}

export function InspectorPanel({
    activeCommandLabel,
    commandSession,
    inspector,
}: InspectorPanelProps) {
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
            {inspector.activeSketch ? (
                <SketchSessionInspector sketch={inspector.activeSketch} />
            ) : null}
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">选择</span>
                <strong>{inspector.selectionLabel}</strong>
            </div>
            {inspector.object ? (
                <ObjectInspector inspector={inspector} />
            ) : inspector.selectedSketchEntity ? (
                <SelectionTargetInspector inspector={inspector} />
            ) : (
                <div className="cad-workbench__empty-note">
                    选择基准面后可进入草图；进入草图后可使用直线工具绘制草图线。
                </div>
            )}
        </aside>
    );
}

function SelectionTargetInspector({ inspector }: { readonly inspector: InspectorViewModel }) {
    return (
        <>
            <SelectionPrimitiveInspector selectedTarget={inspector.selectedTarget} />
            {inspector.selectedSketchEntity ? (
                <SketchEntityRefInspector entity={inspector.selectedSketchEntity} />
            ) : null}
        </>
    );
}

function SketchSessionInspector({
    sketch,
}: {
    readonly sketch: NonNullable<InspectorViewModel['activeSketch']>;
}) {
    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">当前模式</span>
                <strong>编辑草图</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">当前草图</span>
                <strong>{sketch.name}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">草图平面</span>
                <strong>{sketch.planeKind}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">当前工具</span>
                <strong>{sketch.activeToolLabel}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">元素数量</span>
                <strong>{sketch.entityCount}</strong>
            </div>
        </>
    );
}

function ObjectInspector({ inspector }: { readonly inspector: InspectorViewModel }) {
    const object = inspector.object;

    if (!object) {
        return null;
    }

    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">对象类型</span>
                <strong>{object.kindLabel}</strong>
            </div>
            {object.positionLabel ? (
                <div className="cad-workbench__inspector-section">
                    <span className="cad-workbench__inspector-label">位置</span>
                    <strong>{object.positionLabel}</strong>
                </div>
            ) : null}
            {object.planeKindLabel ? (
                <div className="cad-workbench__inspector-section">
                    <span className="cad-workbench__inspector-label">平面</span>
                    <strong>{object.planeKindLabel}</strong>
                </div>
            ) : null}
            <SelectionPrimitiveInspector selectedTarget={inspector.selectedTarget} />
            {inspector.selectedSketchEntity ? (
                <SketchEntityRefInspector entity={inspector.selectedSketchEntity} />
            ) : null}
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">可见性</span>
                <strong>{object.visibleLabel}</strong>
            </div>
        </>
    );
}

function SelectionPrimitiveInspector({
    selectedTarget,
}: {
    readonly selectedTarget: InspectorViewModel['selectedTarget'];
}) {
    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">拾取目标</span>
                <strong>{selectedTarget?.kindLabel ?? '对象'}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">Primitive ID</span>
                <strong>{selectedTarget?.primitiveId ?? '-'}</strong>
            </div>
        </>
    );
}

function SketchEntityRefInspector({
    entity,
}: {
    readonly entity: NonNullable<InspectorViewModel['selectedSketchEntity']>;
}) {
    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">草图实体</span>
                <strong>{entity.kindLabel}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">实体 ID</span>
                <strong>{entity.id}</strong>
            </div>
        </>
    );
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
