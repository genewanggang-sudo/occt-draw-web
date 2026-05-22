import {
    AppendFeatureOperation,
    Feature,
    SetFeaturePayloadOperation,
    type ReferencePlaneObject,
    referencePlaneToPlane,
} from '@occt-draw/cad-model';
import { DocumentTransaction } from '@occt-draw/core';
import { Vec3 } from '@occt-draw/math';
import { createSketchOnReferencePlane } from '@occt-draw/sketch';
import { clearSelection } from '@occt-draw/platform';
import type { CameraState } from '@occt-draw/canvas';
import {
    CadCommand,
    createHandledCommandResult,
    type CommandContext,
    type CommandResult,
} from './CadCommand';

const SKETCH_WORKSPACE_CAMERA_HEIGHT_SCALE = 1.55;

export class SketchCommand extends CadCommand {
    public readonly id = 'sketch';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        const selectedPlane = findSelectedReferencePlane(context);

        if (!selectedPlane) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch',
                    message: '请选择一个基准面后再进入草图。',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
                draft: null,
            });
        }

        const partStudio = state.document.getActivePartStudio();
        const sketchIndex =
            partStudio.features.filter((feature) => feature.type === 'sketch').length + 1;
        const sketchIndexText = String(sketchIndex);
        const sketchId = `sketch:${sketchIndexText}`;
        const featureId = `feature:sketch:${sketchIndexText}`;
        const sketchName = `草图${sketchIndexText}`;
        const sketch = createSketchOnReferencePlane({
            id: sketchId,
            name: sketchName,
            planeKind: selectedPlane.planeKind,
            planeRef: selectedPlane.id,
        });
        const feature = new Feature({
            id: featureId,
            name: sketchName,
            payloadRef: sketch.id,
            type: 'sketch',
        });

        return createHandledCommandResult({
            activeSketchSession: {
                activeTool: 'select',
                pendingLineStartVertexId: null,
                pendingRectangleStart: null,
                sketchFeatureId: feature.id,
            },
            commandSession: {
                id: 'sketch',
                message: `正在编辑 ${sketchName}。`,
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentEdit: new DocumentTransaction({
                label: `创建${sketchName}`,
                operations: [
                    new AppendFeatureOperation({
                        feature,
                        label: `创建${sketchName}`,
                        partStudioId: partStudio.id,
                    }),
                    new SetFeaturePayloadOperation({
                        label: `写入${sketchName}数据`,
                        partStudioId: partStudio.id,
                        payload: sketch,
                        payloadId: sketch.id,
                    }),
                ],
            }),
            draft: null,
            selection: clearSelection(state.selection),
            navigation: {
                ...state.navigation,
                camera: createSketchPlaneCamera(selectedPlane, state.navigation.camera),
                drag: null,
                orbitPivot: selectedPlane.origin,
                sceneCenter: selectedPlane.origin,
                sceneRadius: selectedPlane.size,
            },
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: null,
            commandSession: {
                id: 'select',
                message: '已退出草图。',
                selectionContext: state.commandSession.selectionContext,
                status: 'idle',
            },
            draft: null,
        });
    }

    public override exit(): CommandResult {
        return createHandledCommandResult();
    }
}

function findSelectedReferencePlane(context: CommandContext): ReferencePlaneObject | null {
    const state = context.getState();
    const primaryTarget = state.selection.selection.primaryTarget;

    if (primaryTarget?.targetKind !== 'object') {
        return null;
    }

    const object = state.document.getActivePartStudio().findObjectById(primaryTarget.objectId);

    return object?.kind === 'reference-plane' ? object : null;
}

function createSketchPlaneCamera(
    plane: ReferencePlaneObject,
    currentCamera: CameraState,
): CameraState {
    const workPlane = referencePlaneToPlane(plane);
    const distance = Math.max(plane.size * 2, 1);

    return {
        ...currentCamera,
        position: Vec3.add(workPlane.origin, Vec3.scale(workPlane.normal, distance)),
        target: workPlane.origin,
        up: workPlane.yAxis,
        orthographicHeight: Math.max(plane.size * SKETCH_WORKSPACE_CAMERA_HEIGHT_SCALE, 1),
    };
}
