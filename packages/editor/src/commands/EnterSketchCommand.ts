import {
    CreateFeaturePayloadRequest,
    Feature,
    createFeaturePayloadRef,
    type ReferencePlaneObject,
} from '@occt-draw/cad-model';
import type { CameraState } from '@occt-draw/canvas';
import { createModelRef } from '@occt-draw/core';
import { Plane3, Vec3 } from '@occt-draw/math';
import { clearSelection } from '@occt-draw/platform';
import { createSketchOnReferencePlane } from '@occt-draw/sketch';
import {
    CadCommand,
    createHandledCommandResult,
    type CommandContext,
    type CommandResult,
} from './CadCommand';
import { createDefaultSketchDisplayOptions } from '../state/editorState';

const SKETCH_WORKSPACE_CAMERA_HEIGHT_SCALE = 1.55;
const SKETCH_CAMERA_DEPTH_SCALE = 4;

export class EnterSketchCommand extends CadCommand {
    public readonly id = 'sketch';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        const selectedPlane = findSelectedReferencePlane(context);

        if (!selectedPlane) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch',
                    message: 'Select a reference plane before entering sketch.',
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
        const sketchName = `Sketch ${sketchIndexText}`;
        const sketch = createSketchOnReferencePlane({
            id: sketchId,
            name: sketchName,
            planeKind: selectedPlane.planeKind,
            planeObjectRef: createModelRef({
                id: selectedPlane.id,
                kind: 'cad.object.reference-plane',
            }),
        });
        const feature = new Feature({
            id: featureId,
            name: sketchName,
            payloadRef: createFeaturePayloadRef(sketch.id),
            type: 'sketch',
        });

        return createHandledCommandResult({
            activeSketchSession: {
                displayOptions: createDefaultSketchDisplayOptions(),
                sketchFeatureId: feature.id,
                tool: { kind: 'select' },
            },
            commandSession: {
                id: 'sketch',
                message: `Editing ${sketchName}.`,
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new CreateFeaturePayloadRequest({
                feature,
                history: {
                    label: `Create ${sketchName}`,
                },
                label: `Create ${sketchName}`,
                partStudioId: partStudio.id,
                payload: sketch,
                payloadId: sketch.id,
                transactionId: `create-sketch:${sketch.id}`,
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
                message: 'Exited sketch.',
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
    const workPlane = new Plane3(plane.origin, plane.normal, plane.xAxis);
    const distance = Math.max(plane.size * 2, 1);
    const depthRange = Math.max(plane.size * SKETCH_CAMERA_DEPTH_SCALE, distance * 2, 1);

    return {
        ...currentCamera,
        far: depthRange,
        near: 0.01,
        position: Vec3.add(workPlane.origin, Vec3.scale(workPlane.normal, distance)),
        target: workPlane.origin,
        up: workPlane.yAxis,
        orthographicHeight: Math.max(plane.size * SKETCH_WORKSPACE_CAMERA_HEIGHT_SCALE, 1),
    };
}
