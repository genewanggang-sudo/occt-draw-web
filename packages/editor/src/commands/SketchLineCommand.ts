import { createEditDraft, DocumentTransaction } from '@occt-draw/core';
import {
    findSketchByFeatureId,
    referencePlaneToPlane,
    SetFeaturePayloadOperation,
    type CadDocument,
} from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import {
    AddLineSegmentRequest,
    AddPointRequest,
    DeleteSketchEntityRequest,
    sketchPointToWorldOnPlane,
    type Sketch,
    type SketchEntityRef,
    type SketchVertexId,
} from '@occt-draw/sketch';
import {
    SketchSnapService,
    type SketchSnapResult,
    type SketchSnapSource,
} from '@occt-draw/sketch-snapping';
import { projectWorldToScreen } from '@occt-draw/webgl-engine';
import type { EditorState, SketchEditSession } from '../state/editorState';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { projectScreenPointToSketch2 } from './sketchProjection';

const MIN_LINE_LENGTH = 1e-6;
const LINE_SNAP_THRESHOLD_PIXELS = 9;

export class SketchLineCommand extends CadCommand {
    public readonly id = 'sketch-line';
    private readonly snapService = new SketchSnapService();

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
                pendingLineStartVertexId: null,
                pendingRectangleStart: null,
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
        const session = state.activeSketchSession;

        if (session?.pendingLineStartVertexId) {
            const activeSketch = findActiveSketch(state, session);

            if (!activeSketch) {
                return createHandledCommandResult({
                    draft: null,
                });
            }

            if (isVertexUsedByEdge(activeSketch.sketch, session.pendingLineStartVertexId)) {
                return createHandledCommandResult({
                    activeSketchSession: {
                        ...session,
                        pendingLineStartVertexId: null,
                    },
                    commandSession: {
                        id: 'sketch-line',
                        message: '已结束连续直线，继续指定直线起点。',
                        selectionContext: state.commandSession.selectionContext,
                        status: 'running',
                    },
                    draft: null,
                });
            }

            const sketch = activeSketch.sketch.clone();
            const request = new DeleteSketchEntityRequest({
                entityRef: {
                    kind: 'vertex',
                    sketchId: sketch.id,
                    vertexId: session.pendingLineStartVertexId,
                },
            });
            const transaction = request.createTransaction();

            transaction.commit(sketch);

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingLineStartVertexId: null,
                },
                commandSession: {
                    id: 'sketch-line',
                    message: '已取消当前直线，继续指定直线起点。',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                documentEdit: createSetSketchPayloadTransaction(state, sketch),
                draft: null,
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
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const resolvedPoint = this.resolveLinePoint(context, activeSketch.sketch, event);
        const point2 = resolvedPoint.snap?.point ?? resolvedPoint.rawPoint;
        const snappedVertexId = getSnappedVertexId(resolvedPoint.snap);

        if (!point2) {
            return createHandledCommandResult({
                message: '当前视线与草图平面平行，无法取点。',
            });
        }

        if (!session.pendingLineStartVertexId) {
            if (snappedVertexId) {
                return this.createLineStartFromVertexResult(context, snappedVertexId);
            }

            return this.createLineStartResult(context, activeSketch.sketch, point2);
        }

        return this.createLineEndResult(
            context,
            activeSketch.sketch,
            session.pendingLineStartVertexId,
            point2,
            snappedVertexId,
        );
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingLineStartVertexId || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const sketch = activeSketch.sketch;
        const startPoint = sketch.findPointForVertex(session.pendingLineStartVertexId);
        const resolvedPoint = this.resolveLinePoint(
            context,
            sketch,
            event,
            session.pendingLineStartVertexId,
        );
        const endPoint2 = resolvedPoint.snap?.point ?? resolvedPoint.rawPoint;

        if (!startPoint || !resolvedPoint.plane || !endPoint2) {
            return createUnhandledCommandResult();
        }

        const startWorld = sketchPointToWorldOnPlane(resolvedPoint.plane, startPoint.position);
        const endWorld =
            resolvedPoint.snap?.worldPoint ??
            sketchPointToWorldOnPlane(resolvedPoint.plane, endPoint2);

        return createHandledCommandResult({
            draft: createEditDraft<CadDocument>({
                id: 'draft:sketch-line',
                kind: 'sketch',
            }).withTemporaryObjects([
                {
                    id: 'draft:sketch-line:segment',
                    kind: 'line-segment',
                    visible: true,
                    color: Vec3.of(0.1, 0.55, 1),
                    segment: new LineSegment3(startWorld, endWorld),
                },
                ...(resolvedPoint.snap
                    ? [
                          {
                              id: 'draft:sketch-line:snap-point',
                              kind: 'point' as const,
                              visible: true,
                              color: Vec3.of(1, 0.72, 0.18),
                              point: endWorld,
                          },
                      ]
                    : []),
            ]),
        });
    }

    private resolveLinePoint(
        context: CommandContext,
        sketch: Sketch,
        event: CommandPointerEvent,
        excludedVertexId: SketchVertexId | null = null,
    ): {
        readonly plane: Plane3 | null;
        readonly rawPoint: Vector2 | null;
        readonly snap: SketchSnapResult<SketchEntityRef> | null;
    } {
        const state = context.getState();
        const plane = findSketchPlane(state, sketch);
        const rawPoint = projectScreenPointToSketch2({
            camera: state.navigation.camera,
            partStudio: state.document.getActivePartStudio(),
            planeRef: sketch.planeRef,
            point: event.point,
            viewportSize: state.navigation.viewportSize,
        });

        if (!plane || !rawPoint) {
            return { plane, rawPoint, snap: null };
        }

        return {
            plane,
            rawPoint,
            snap: this.snapService.resolve({
                enabledKinds: ['vertex'],
                candidates: collectSketchVertexSnapSources(state, sketch, plane, excludedVertexId),
                pointerPoint: event.point,
                rawSketchPoint: rawPoint,
                thresholdPixels: LINE_SNAP_THRESHOLD_PIXELS,
            }),
        };
    }

    private createLineStartFromVertexResult(
        context: CommandContext,
        vertexId: SketchVertexId,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStartVertexId: vertexId,
            },
            commandSession: {
                id: 'sketch-line',
                message: '已吸附端点，指定直线终点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    private createLineStartResult(
        context: CommandContext,
        sourceSketch: Sketch,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        const sketch = sourceSketch.clone();
        const request = new AddPointRequest({ position: point });
        const transaction = request.createTransaction();

        transaction.commit(sketch);

        if (!request.createdVertexId) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStartVertexId: request.createdVertexId,
            },
            commandSession: {
                id: 'sketch-line',
                message: '指定直线终点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentEdit: createSetSketchPayloadTransaction(state, sketch),
        });
    }

    private createLineEndResult(
        context: CommandContext,
        sourceSketch: Sketch,
        startVertexId: SketchVertexId,
        point: Vector2,
        snappedEndVertexId: SketchVertexId | null,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        const sketch = sourceSketch.clone();
        const startPoint = sketch.findPointForVertex(startVertexId);

        if (!startPoint || Vec2.distance(startPoint.position, point) <= MIN_LINE_LENGTH) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-line',
                    message: '直线长度过短，继续指定直线终点。',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
            });
        }

        const request = snappedEndVertexId
            ? new AddLineSegmentRequest({
                  endVertexId: snappedEndVertexId,
                  startVertexId,
              })
            : new AddLineSegmentRequest({
                  endPosition: point,
                  startVertexId,
              });
        const transaction = request.createTransaction();

        transaction.commit(sketch);

        if (!request.createdEndVertexId) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingLineStartVertexId: request.createdEndVertexId,
            },
            commandSession: {
                id: 'sketch-line',
                message: '直线已创建，继续指定下一段终点。',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentEdit: createSetSketchPayloadTransaction(state, sketch),
            draft: null,
        });
    }
}

function createSetSketchPayloadTransaction(
    state: EditorState,
    sketch: Sketch,
): DocumentTransaction<CadDocument> {
    return new DocumentTransaction<CadDocument>({
        label: `更新${sketch.name}`,
        operations: [
            new SetFeaturePayloadOperation({
                label: `更新${sketch.name}数据`,
                partStudioId: state.document.getActivePartStudio().id,
                payload: sketch,
                payloadId: sketch.id,
            }),
        ],
    });
}

function findActiveSketch(
    state: EditorState,
    session: SketchEditSession,
): { readonly sketch: Sketch } | null {
    const partStudio = state.document.getActivePartStudio();
    const sketch = findSketchByFeatureId(partStudio, session.sketchFeatureId);

    return sketch ? { sketch } : null;
}

function findSketchPlane(state: EditorState, sketch: Sketch): Plane3 | null {
    const object = state.document.getActivePartStudio().findObjectById(sketch.planeRef);

    return object?.kind === 'reference-plane' ? referencePlaneToPlane(object) : null;
}

function collectSketchVertexSnapSources(
    state: EditorState,
    sketch: Sketch,
    plane: Plane3,
    excludedVertexId: SketchVertexId | null,
): readonly SketchSnapSource<SketchEntityRef>[] {
    const sources: SketchSnapSource<SketchEntityRef>[] = [];

    for (const vertex of sketch.entities.topology.vertices.list()) {
        if (vertex.id === excludedVertexId) {
            continue;
        }

        const point = sketch.findPointForVertex(vertex.id);

        if (!point) {
            continue;
        }

        const worldPoint = plane.localToWorld(point.position);

        sources.push({
            kind: 'vertex',
            point: point.position,
            screenPoint: projectWorldToScreen(
                worldPoint,
                state.navigation.camera,
                state.navigation.viewportSize,
            ),
            sourceRef: vertex.ref,
            stableId: vertex.id,
            worldPoint,
        });
    }

    return sources;
}

function isVertexUsedByEdge(sketch: Sketch, vertexId: SketchVertexId): boolean {
    return sketch.entities.topology.edges
        .list()
        .some((edge) => edge.startVertexId === vertexId || edge.endVertexId === vertexId);
}

function getSnappedVertexId(snap: SketchSnapResult<SketchEntityRef> | null): SketchVertexId | null {
    return snap?.sourceRef?.kind === 'vertex' ? snap.sourceRef.vertexId : null;
}
