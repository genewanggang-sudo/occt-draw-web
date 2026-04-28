import type { CadObject, SelectionTarget, SelectionTargetKind } from '@occt-draw/core';
import type { CommandSession, CommandStatus, SketchEditSession } from '@occt-draw/editor';
import type { Sketch, SketchId } from '@occt-draw/sketch';

interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly selectedObjects: readonly CadObject[];
    readonly selectedTarget: SelectionTarget | null;
    readonly sketchesById: Readonly<Record<SketchId, Sketch>>;
}

export function InspectorPanel({
    activeCommandLabel,
    activeSketchSession,
    commandSession,
    selectedObjects,
    selectedTarget,
    sketchesById,
}: InspectorPanelProps) {
    const selectedObject = selectedObjects[0] ?? null;
    const activeSketch = activeSketchSession
        ? (sketchesById[activeSketchSession.sketchId] ?? null)
        : null;

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
            {activeSketch && activeSketchSession ? (
                <SketchSessionInspector sketch={activeSketch} session={activeSketchSession} />
            ) : null}
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">选择</span>
                <strong>{selectedObject ? selectedObject.name : '未选择对象'}</strong>
            </div>
            {selectedObject ? (
                <ObjectInspector object={selectedObject} selectedTarget={selectedTarget} />
            ) : (
                <div className="cad-workbench__empty-note">
                    选择基准面后可进入草图；进入草图后可使用直线工具绘制草图线。
                </div>
            )}
        </aside>
    );
}

function SketchSessionInspector({
    session,
    sketch,
}: {
    readonly session: SketchEditSession;
    readonly sketch: Sketch;
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
                <strong>{sketch.planeKind.toUpperCase()}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">当前工具</span>
                <strong>{session.activeTool === 'line' ? '直线' : '选择'}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">元素数量</span>
                <strong>{sketch.entities.length}</strong>
            </div>
        </>
    );
}

function ObjectInspector({
    object,
    selectedTarget,
}: {
    readonly object: CadObject;
    readonly selectedTarget: SelectionTarget | null;
}) {
    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">对象类型</span>
                <strong>{getObjectKindLabel(object)}</strong>
            </div>
            {object.kind === 'reference-origin' ? <OriginInspector object={object} /> : null}
            {object.kind === 'reference-plane' ? <PlaneInspector object={object} /> : null}
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">拾取目标</span>
                <strong>
                    {selectedTarget ? getPickTargetKindLabel(selectedTarget.targetKind) : '对象'}
                </strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">Primitive ID</span>
                <strong>{selectedTarget?.primitiveId ?? '-'}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">可见性</span>
                <strong>{object.visible ? '可见' : '隐藏'}</strong>
            </div>
        </>
    );
}

function OriginInspector({
    object,
}: {
    readonly object: Extract<CadObject, { kind: 'reference-origin' }>;
}) {
    return (
        <div className="cad-workbench__inspector-section">
            <span className="cad-workbench__inspector-label">位置</span>
            <strong>
                {object.position.x}, {object.position.y}, {object.position.z}
            </strong>
        </div>
    );
}

function PlaneInspector({
    object,
}: {
    readonly object: Extract<CadObject, { kind: 'reference-plane' }>;
}) {
    return (
        <div className="cad-workbench__inspector-section">
            <span className="cad-workbench__inspector-label">平面</span>
            <strong>{object.planeKind.toUpperCase()}</strong>
        </div>
    );
}

function getObjectKindLabel(object: CadObject): string {
    if (object.kind === 'reference-origin') {
        return '原点';
    }

    return '基准面';
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
