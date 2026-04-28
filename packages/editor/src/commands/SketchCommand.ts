import {
    AppendFeatureOperation,
    DocumentTransaction,
    Feature,
    type ReferencePlaneObject,
} from '@occt-draw/core';
import { createSketchOnReferencePlane } from '@occt-draw/sketch';
import {
    CadCommand,
    createHandledCommandResult,
    type CommandContext,
    type CommandResult,
} from './CadCommand';

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
                pendingLineStartPointId: null,
                sketchId: sketch.id,
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
                ],
            }),
            draft: null,
            sketches: {
                sketchesById: {
                    ...state.sketches.sketchesById,
                    [sketch.id]: sketch,
                },
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
