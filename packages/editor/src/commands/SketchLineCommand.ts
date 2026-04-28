import { createEditDraft } from '@occt-draw/core';
import { createLineSegment3, createVector3 } from '@occt-draw/math';
import {
    addSketchEntity,
    createSketchLine,
    createSketchPoint,
    findSketchPointById,
    removeSketchEntity,
    sketchPointToWorld,
    type Sketch,
    type SketchEntityId,
} from '@occt-draw/sketch';
import type { EditorState, SketchDocumentStore } from '../state/editorState';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { projectScreenPointToSketch2 } from './sketchProjection';

export class SketchLineCommand extends CadCommand {
    public readonly id = 'sketch-line';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-line',
                    message: '进入草图后才能使用直线。',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'line',
                pendingLineStartPointId: null,
            },
            commandSession: {
                id: 'sketch-line',
                message: '指定直线起点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();

        if (state.activeSketchSession?.pendingLineStartPointId) {
            const pendingPointId = state.activeSketchSession.pendingLineStartPointId;
            const sketch = state.sketches.sketchesById[state.activeSketchSession.sketchId];
            const nextSketch = sketch ? removeSketchEntity(sketch, pendingPointId) : null;

            return createHandledCommandResult({
                activeSketchSession: {
                    ...state.activeSketchSession,
                    pendingLineStartPointId: null,
                },
                commandSession: {
                    id: 'sketch-line',
                    message: '已取消当前直线，继续指定直线起点。',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
                ...(nextSketch ? { sketches: replaceSketch(state, nextSketch) } : {}),
            });
        }

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
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override pointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const sketch = session ? state.sketches.sketchesById[session.sketchId] : null;

        if (!session || !sketch) {
            return createUnhandledCommandResult();
        }

        const point2 = projectScreenPointToSketch2({
            camera: state.navigation.camera,
            planeKind: sketch.planeKind,
            point: event.point,
            viewportSize: state.navigation.viewportSize,
        });

        if (!point2) {
            return createHandledCommandResult({
                message: '当前视线与草图平面平行，无法取点。',
            });
        }

        if (!session.pendingLineStartPointId) {
            return this.createLineStartResult(context, sketch, point2);
        }

        return this.createLineEndResult(context, sketch, session.pendingLineStartPointId, point2);
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const sketch = session ? state.sketches.sketchesById[session.sketchId] : null;

        if (!session?.pendingLineStartPointId || !sketch) {
            return createUnhandledCommandResult();
        }

        const startPoint = findSketchPointById(sketch, session.pendingLineStartPointId);
        const endPoint2 = projectScreenPointToSketch2({
            camera: state.navigation.camera,
            planeKind: sketch.planeKind,
            point: event.point,
            viewportSize: state.navigation.viewportSize,
        });

        if (!startPoint || !endPoint2) {
            return createUnhandledCommandResult();
        }

        const temporaryEnd = createSketchPoint({
            id: 'draft:line:end',
            x: endPoint2.x,
            y: endPoint2.y,
        });

        return createHandledCommandResult({
            draft: createEditDraft({
                id: 'draft:sketch-line',
                kind: 'sketch',
            }).withTemporaryObjects([
                {
                    id: 'draft:sketch-line:segment',
                    kind: 'line-segment',
                    visible: true,
                    color: createVector3(0.1, 0.55, 1),
                    segment: createLineSegment3(
                        sketchPointToWorld(sketch, startPoint),
                        sketchPointToWorld(sketch, temporaryEnd),
                    ),
                },
            ]),
        });
    }

    private createLineStartResult(
        context: CommandContext,
        sketch: Sketch,
        point: { readonly x: number; readonly y: number },
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        const pointId = createSketchEntityId(sketch, 'point');
        const sketchPoint = createSketchPoint({
            id: pointId,
            x: point.x,
            y: point.y,
        });
        const nextSketch = addSketchEntity(sketch, sketchPoint);

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStartPointId: pointId,
            },
            commandSession: {
                id: 'sketch-line',
                message: '指定直线终点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            sketches: replaceSketch(state, nextSketch),
        });
    }

    private createLineEndResult(
        context: CommandContext,
        sketch: Sketch,
        startPointId: SketchEntityId,
        point: { readonly x: number; readonly y: number },
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        const endPointId = createSketchEntityId(sketch, 'point');
        const lineId = createSketchEntityId(sketch, 'line');
        const endPoint = createSketchPoint({
            id: endPointId,
            x: point.x,
            y: point.y,
        });
        const line = createSketchLine({
            endPointId,
            id: lineId,
            startPointId,
        });
        const nextSketch = addSketchEntity(addSketchEntity(sketch, endPoint), line);

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStartPointId: null,
            },
            commandSession: {
                id: 'sketch-line',
                message: '直线已创建，继续指定下一条直线起点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
            sketches: replaceSketch(state, nextSketch),
        });
    }
}

function replaceSketch(state: EditorState, sketch: Sketch): SketchDocumentStore {
    return {
        sketchesById: {
            ...state.sketches.sketchesById,
            [sketch.id]: sketch,
        },
    };
}

function createSketchEntityId(sketch: Sketch, kind: 'line' | 'point'): SketchEntityId {
    const count = sketch.entities.filter((entity) => entity.kind === kind).length + 1;

    return `${sketch.id}:${kind}:${String(count)}`;
}
