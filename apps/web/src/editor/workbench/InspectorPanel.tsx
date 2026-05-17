import type { CadObject, PartStudio } from '@occt-draw/cad-model';
import { findSketchByFeatureId } from '@occt-draw/cad-model';
import type { SelectionTarget, SelectionTargetKind } from '@occt-draw/core';
import {
    getSketchEntityRefFromSelectionTarget,
    type CommandSession,
    type CommandStatus,
    type SketchEditSession,
} from '@occt-draw/editor';
import type { Sketch, SketchEntityRef } from '@occt-draw/sketch';

interface InspectorPanelProps {
    readonly activeCommandLabel: string;
    readonly activeSketchSession: SketchEditSession | null;
    readonly commandSession: CommandSession;
    readonly partStudio: PartStudio;
    readonly selectedObjects: readonly CadObject[];
    readonly selectedTarget: SelectionTarget | null;
}

export function InspectorPanel({
    activeCommandLabel,
    activeSketchSession,
    commandSession,
    partStudio,
    selectedObjects,
    selectedTarget,
}: InspectorPanelProps) {
    const selectedObject = selectedObjects[0] ?? null;
    const activeSketch = activeSketchSession
        ? findSketchByFeatureId(partStudio, activeSketchSession.sketchFeatureId)
        : null;
    const selectedSketchEntityRef = getSketchEntityRefFromSelectionTarget(selectedTarget);

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
                <strong>
                    {selectedObject
                        ? selectedObject.name
                        : selectedSketchEntityRef
                          ? getSketchEntityKindLabel(selectedSketchEntityRef)
                          : '未选择对象'}
                </strong>
            </div>
            {selectedObject ? (
                <ObjectInspector object={selectedObject} selectedTarget={selectedTarget} />
            ) : selectedSketchEntityRef ? (
                <SelectionTargetInspector
                    entityRef={selectedSketchEntityRef}
                    selectedTarget={selectedTarget}
                />
            ) : (
                <div className="cad-workbench__empty-note">
                    选择基准面后可进入草图；进入草图后可使用直线工具绘制草图线。
                </div>
            )}
        </aside>
    );
}

function SelectionTargetInspector({
    entityRef,
    selectedTarget,
}: {
    readonly entityRef: SketchEntityRef;
    readonly selectedTarget: SelectionTarget | null;
}) {
    return (
        <>
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
            <SketchEntityRefInspector entityRef={entityRef} />
        </>
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
                <strong>
                    {sketch.entities.geometry.points.list().length +
                        sketch.entities.topology.edges.list().length}
                </strong>
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
    const sketchEntityRef = getSketchEntityRefFromSelectionTarget(selectedTarget);

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
            {sketchEntityRef ? <SketchEntityRefInspector entityRef={sketchEntityRef} /> : null}
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">可见性</span>
                <strong>{object.visible ? '可见' : '隐藏'}</strong>
            </div>
        </>
    );
}

function SketchEntityRefInspector({ entityRef }: { readonly entityRef: SketchEntityRef }) {
    return (
        <>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">草图实体</span>
                <strong>{getSketchEntityKindLabel(entityRef)}</strong>
            </div>
            <div className="cad-workbench__inspector-section">
                <span className="cad-workbench__inspector-label">实体 ID</span>
                <strong>{getSketchEntityId(entityRef)}</strong>
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

function getSketchEntityKindLabel(ref: SketchEntityRef): string {
    if (ref.kind === 'edge') {
        return '草图边';
    }

    if (ref.kind === 'vertex') {
        return '草图顶点';
    }

    if (ref.kind === 'point') {
        return '草图点';
    }

    if (ref.kind === 'curve') {
        return '草图曲线';
    }

    if (ref.kind === 'constraint') {
        return '草图约束';
    }

    if (ref.kind === 'dimension') {
        return '草图尺寸';
    }

    if (ref.kind === 'profile') {
        return '草图区域';
    }

    return '草图状态';
}

function getSketchEntityId(ref: SketchEntityRef): string {
    if (ref.kind === 'edge') {
        return ref.edgeId;
    }

    if (ref.kind === 'vertex') {
        return ref.vertexId;
    }

    if (ref.kind === 'point') {
        return ref.pointId;
    }

    if (ref.kind === 'curve') {
        return ref.curveId;
    }

    if (ref.kind === 'constraint') {
        return ref.constraintId;
    }

    if (ref.kind === 'dimension') {
        return ref.dimensionId;
    }

    if (ref.kind === 'profile') {
        return ref.profileId;
    }

    return ref.sketchId;
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
