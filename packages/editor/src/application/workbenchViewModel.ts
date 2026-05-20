import {
    findSketchByFeatureId,
    getActivePartStudio,
    getSketchForFeature,
} from '@occt-draw/cad-model';
import type {
    CadObject,
    PartStudio,
    ReferenceOriginObject,
    ReferencePlaneKind,
    ReferencePlaneObject,
} from '@occt-draw/cad-model';
import type { SelectionTarget, SelectionTargetKind } from '@occt-draw/core';
import { SketchEntityKind, type Sketch, type SketchEntityRef } from '@occt-draw/sketch';
import { evaluateCommandAvailabilityMap } from '../commands/commandRegistry';
import type { CommandAvailabilityMap } from '../commands/commandTypes';
import type { EditorState, SketchEditSession } from '../state/editorState';
import { getSketchEntityRefFromSelectionTarget } from '../selection/sketchSelection';

export interface EditorWorkbenchViewModel {
    readonly commandAvailability: CommandAvailabilityMap;
    readonly inspector: InspectorViewModel;
    readonly modelTree: ModelTreeViewModel;
    readonly selectedObjectIds: readonly string[];
}

export interface ModelTreeViewModel {
    readonly defaultGeometryItems: readonly ModelTreeDefaultGeometryItem[];
    readonly featureCount: number;
    readonly features: readonly ModelTreeFeatureItem[];
}

export interface ModelTreeDefaultGeometryItem {
    readonly id: string;
    readonly label: string;
    readonly objectId: string | null;
    readonly selected: boolean;
    readonly type: 'origin' | 'plane';
}

export interface ModelTreeFeatureItem {
    readonly id: string;
    readonly label: string;
    readonly type: string;
}

export interface InspectorViewModel {
    readonly activeSketch: InspectorSketchSession | null;
    readonly object: InspectorObject | null;
    readonly selectedSketchEntity: InspectorSketchEntity | null;
    readonly selectedTarget: InspectorSelectionTarget | null;
    readonly selectionLabel: string;
}

export interface InspectorSketchSession {
    readonly activeToolLabel: string;
    readonly entityCount: number;
    readonly name: string;
    readonly planeKind: string;
}

export interface InspectorObject {
    readonly kindLabel: string;
    readonly positionLabel?: string;
    readonly planeKindLabel?: string;
    readonly visibleLabel: string;
}

export interface InspectorSelectionTarget {
    readonly kindLabel: string;
    readonly primitiveId: string;
}

export interface InspectorSketchEntity {
    readonly id: string;
    readonly kindLabel: string;
}

export function createEditorWorkbenchViewModel(state: EditorState): EditorWorkbenchViewModel {
    const partStudio = getActivePartStudio(state.document);
    const selectedObjectIds = state.selection.selection.objectIds;
    const selectedObjects = partStudio.objects.filter((object) =>
        selectedObjectIds.includes(object.id),
    );
    const selectedReferencePlaneCount = selectedObjects.filter(
        (object) => object.kind === 'reference-plane',
    ).length;

    return {
        commandAvailability: evaluateCommandAvailabilityMap({
            activeSketchTool: state.activeSketchSession?.activeTool ?? null,
            hasSketchProfile: false,
            isEditingSketch: state.activeSketchSession !== null,
            selectionObjectIds: selectedObjectIds,
            selectedReferencePlaneCount,
        }),
        inspector: createInspectorViewModel({
            activeSketchSession: state.activeSketchSession,
            partStudio,
            selectedObjects,
            selectedTarget: state.selection.selection.primaryTarget,
        }),
        modelTree: createModelTreeViewModel(partStudio, selectedObjectIds),
        selectedObjectIds,
    };
}

function createModelTreeViewModel(
    partStudio: PartStudio,
    selectedObjectIds: readonly string[],
): ModelTreeViewModel {
    const defaultGeometryItems = createDefaultGeometryItems(partStudio).map((item) => ({
        ...item,
        selected: item.objectId ? selectedObjectIds.includes(item.objectId) : false,
    }));
    const features = partStudio.features.map((feature) => {
        const sketch = getSketchForFeature(partStudio, feature);

        return {
            id: feature.id,
            label: sketch?.name ?? feature.name,
            type: feature.type,
        };
    });

    return {
        defaultGeometryItems,
        featureCount: defaultGeometryItems.length + features.length,
        features,
    };
}

function createInspectorViewModel({
    activeSketchSession,
    partStudio,
    selectedObjects,
    selectedTarget,
}: {
    readonly activeSketchSession: SketchEditSession | null;
    readonly partStudio: PartStudio;
    readonly selectedObjects: readonly CadObject[];
    readonly selectedTarget: SelectionTarget | null;
}): InspectorViewModel {
    const selectedObject = selectedObjects[0] ?? null;
    const activeSketch = activeSketchSession
        ? findSketchByFeatureId(partStudio, activeSketchSession.sketchFeatureId)
        : null;
    const selectedSketchEntityRef = getSketchEntityRefFromSelectionTarget(selectedTarget);
    const selectedSketchEntity = selectedSketchEntityRef
        ? createInspectorSketchEntity(selectedSketchEntityRef)
        : null;

    return {
        activeSketch:
            activeSketch && activeSketchSession
                ? createInspectorSketchSession(activeSketch, activeSketchSession)
                : null,
        object: selectedObject ? createInspectorObject(selectedObject) : null,
        selectedSketchEntity,
        selectedTarget: selectedTarget
            ? {
                  kindLabel: getPickTargetKindLabel(selectedTarget.targetKind),
                  primitiveId: selectedTarget.primitiveId ?? '-',
              }
            : null,
        selectionLabel: selectedObject
            ? selectedObject.name
            : selectedSketchEntity
              ? selectedSketchEntity.kindLabel
              : '未选择对象',
    };
}

function createDefaultGeometryItems(
    partStudio: PartStudio,
): readonly Omit<ModelTreeDefaultGeometryItem, 'selected'>[] {
    return [
        {
            id: 'origin',
            label: '原点',
            objectId: findOrigin(partStudio.objects)?.id ?? null,
            type: 'origin',
        },
        {
            id: 'top',
            label: '上',
            objectId: findPlaneByKind(partStudio.objects, 'xy')?.id ?? null,
            type: 'plane',
        },
        {
            id: 'front',
            label: '前',
            objectId: findPlaneByKind(partStudio.objects, 'zx')?.id ?? null,
            type: 'plane',
        },
        {
            id: 'right',
            label: '右',
            objectId: findPlaneByKind(partStudio.objects, 'yz')?.id ?? null,
            type: 'plane',
        },
    ];
}

function createInspectorObject(object: CadObject): InspectorObject {
    if (object.kind === 'reference-origin') {
        return {
            kindLabel: getObjectKindLabel(object),
            positionLabel: `${String(object.position.x)}, ${String(object.position.y)}, ${String(
                object.position.z,
            )}`,
            visibleLabel: object.visible ? '可见' : '隐藏',
        };
    }

    return {
        kindLabel: getObjectKindLabel(object),
        planeKindLabel: object.planeKind.toUpperCase(),
        visibleLabel: object.visible ? '可见' : '隐藏',
    };
}

function createInspectorSketchEntity(ref: SketchEntityRef): InspectorSketchEntity {
    return {
        id: getSketchEntityId(ref),
        kindLabel: getSketchEntityKindLabel(ref),
    };
}

function createInspectorSketchSession(
    sketch: Sketch,
    session: SketchEditSession,
): InspectorSketchSession {
    return {
        activeToolLabel: session.activeTool === 'line' ? '直线' : '选择',
        entityCount:
            sketch.entities.geometry.points.list().length +
            sketch.entities.topology.edges.list().length,
        name: sketch.name,
        planeKind: sketch.planeKind.toUpperCase(),
    };
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
    if (ref.kind === SketchEntityKind.Edge) {
        return '草图边';
    }

    if (ref.kind === SketchEntityKind.Vertex) {
        return '草图顶点';
    }

    if (ref.kind === SketchEntityKind.Point) {
        return '草图点';
    }

    if (ref.kind === SketchEntityKind.Curve) {
        return '草图曲线';
    }

    if (ref.kind === SketchEntityKind.Constraint) {
        return '草图约束';
    }

    if (ref.kind === SketchEntityKind.Dimension) {
        return '草图尺寸';
    }

    if (ref.kind === SketchEntityKind.Profile) {
        return '草图区域';
    }

    return '草图状态';
}

function getSketchEntityId(ref: SketchEntityRef): string {
    return ref.entityId;
}
