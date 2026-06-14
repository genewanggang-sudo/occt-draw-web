import { createEditDraft } from '@occt-draw/core';
import {
    AddLineSegmentRequest,
    predictLineSegmentEndVertexId,
    type CadDocument,
    type SketchEditTarget,
} from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import {
    SketchEntityKind,
    sketchPointToWorldOnPlane,
    type Sketch,
    type SketchEntityRef,
    type SketchVertexId,
} from '@occt-draw/sketch';
import { SnapService, type SnapResult, type SnapSource } from '@occt-draw/snapping';
import { projectWorldToScreen } from '@occt-draw/canvas';
import type { EditorState, SketchLineStart } from '../state/editorState';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import { projectScreenPointToSketch2 } from './sketchProjection';
import { resolveActiveSketchTarget } from './sketchTargetContext';

const MIN_LINE_LENGTH = 1e-6;
const LINE_SNAP_THRESHOLD_PIXELS = 9;

interface PendingLineDrag {
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
    readonly startedLine: boolean;
    readonly moved: boolean;
}

export class SketchLineCommand extends CadCommand {
    public readonly id = 'sketch-line';
    private pendingDrag: PendingLineDrag | null = null;
    private readonly snapService = new SnapService();

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-line',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { kind: 'line', start: null },
            },
            commandSession: {
                id: 'sketch-line',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        this.pendingDrag = null;

        if (session?.tool.kind === 'line' && session.tool.start) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'line', start: null },
                },
                commandSession: {
                    id: 'sketch-line',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (session) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { kind: 'select' },
                },
                commandSession: {
                    id: 'select',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'idle',
                },
                draft: null,
            });
        }

        return createHandledCommandResult({ draft: null });
    }

    public override exit(): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override onLeftDragCancel(
        _event: CommandPointerEvent,
        _context: CommandContext,
    ): CommandResult {
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    public override onPointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const resolvedPoint = this.resolveLinePoint(context, target, event);
        const point2 = resolvedPoint.snap?.point ?? resolvedPoint.rawPoint;
        const snappedVertexId = getSnappedVertexId(resolvedPoint.snap);

        if (!point2) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!tool.start) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
                startedLine: true,
            };

            if (snappedVertexId) {
                return this.createLineStartFromVertexResult(context, snappedVertexId);
            }

            return this.createLineStartResult(context, point2);
        }

        return this.createLineEndResult(
            context,
            target.sketch,
            tool.start,
            point2,
            snappedVertexId,
            { continueFromEnd: event.clickCount < 2 },
        );
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (this.pendingDrag?.pointerId === event.pointerId && !this.pendingDrag.moved) {
            this.pendingDrag = {
                ...this.pendingDrag,
                moved: true,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.start || !target) {
            return createUnhandledCommandResult();
        }

        const sketch = target.sketch;
        const startPoint = resolveLineStartPoint(sketch, tool.start);
        const resolvedPoint = this.resolveLinePoint(
            context,
            target,
            event,
            getPendingLineStartVertexId(tool.start),
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
                kind: 'temporary',
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

    public override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'line' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.start || !target || !drag?.startedLine || !drag.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const resolvedPoint = this.resolveLinePoint(
            context,
            target,
            event,
            getPendingLineStartVertexId(tool.start),
        );
        const point2 = resolvedPoint.snap?.point ?? resolvedPoint.rawPoint;

        if (!point2) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        return this.createLineEndResult(
            context,
            target.sketch,
            tool.start,
            point2,
            getSnappedVertexId(resolvedPoint.snap),
            { continueFromEnd: false },
        );
    }

    private resolveLinePoint(
        context: CommandContext,
        target: SketchEditTarget,
        event: CommandPointerEvent,
        excludedVertexId: SketchVertexId | null = null,
    ): {
        readonly plane: Plane3 | null;
        readonly rawPoint: Vector2 | null;
        readonly snap: SnapResult<SketchEntityRef> | null;
    } {
        const state = context.getState();
        const plane = target.plane;
        const rawPoint = projectScreenPointToSketch2({
            camera: state.navigation.camera,
            plane,
            point: event.point,
            viewportSize: state.navigation.viewportSize,
        });

        if (!rawPoint) {
            return { plane, rawPoint, snap: null };
        }

        return {
            plane,
            rawPoint,
            snap: this.snapService.resolve({
                enabledKinds: ['vertex'],
                candidates: collectSketchVertexSnapSources(
                    state,
                    target.sketch,
                    plane,
                    excludedVertexId,
                ),
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
                tool: { kind: 'line', start: { kind: 'vertex', vertexId } },
            },
            commandSession: {
                id: 'sketch-line',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }

    private createLineStartResult(context: CommandContext, point: Vector2): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { kind: 'line', start: { kind: 'point', point } },
            },
            commandSession: {
                id: 'sketch-line',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
        });
    }

    private createLineEndResult(
        context: CommandContext,
        sourceSketch: Sketch,
        start: SketchLineStart,
        point: Vector2,
        snappedEndVertexId: SketchVertexId | null,
        options: { readonly continueFromEnd: boolean } = { continueFromEnd: true },
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (!session) {
            return createUnhandledCommandResult();
        }

        const startPoint = resolveLineStartPoint(sourceSketch, start);

        if (!startPoint || Vec2.distance(startPoint.position, point) <= MIN_LINE_LENGTH) {
            if (!options.continueFromEnd) {
                return createHandledCommandResult({
                    activeSketchSession: {
                        ...session,
                        tool: { kind: 'line', start: null },
                    },
                    commandSession: {
                        id: 'sketch-line',
                        message: 'Sketch command updated.',
                        selectionContext: state.commandSession.selectionContext,
                        status: 'running',
                    },
                    draft: null,
                });
            }

            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-line',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
            });
        }

        const input = createAddLineSegmentRequestInput(start, point, snappedEndVertexId);
        const createdEndVertexId = predictLineSegmentEndVertexId(sourceSketch, input);

        if (!createdEndVertexId) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: {
                    kind: 'line',
                    start: options.continueFromEnd
                        ? {
                              kind: 'vertex',
                              vertexId: createdEndVertexId,
                          }
                        : null,
                },
            },
            commandSession: {
                id: 'sketch-line',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddLineSegmentRequest({
                ...input,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }
}

function resolveLineStartPoint(
    sketch: Sketch,
    start: SketchLineStart,
): { readonly position: Vector2 } | null {
    return start.kind === 'vertex'
        ? sketch.findPointForVertex(start.vertexId)
        : { position: start.point };
}

function getPendingLineStartVertexId(start: SketchLineStart): SketchVertexId | null {
    return start.kind === 'vertex' ? start.vertexId : null;
}

function createAddLineSegmentRequestInput(
    start: SketchLineStart,
    endPosition: Vector2,
    endVertexId: SketchVertexId | null,
):
    | { readonly endPosition: Vector2; readonly startPosition: Vector2 }
    | { readonly endPosition: Vector2; readonly startVertexId: SketchVertexId }
    | { readonly endVertexId: SketchVertexId; readonly startPosition: Vector2 }
    | { readonly endVertexId: SketchVertexId; readonly startVertexId: SketchVertexId } {
    if (start.kind === 'vertex') {
        return endVertexId
            ? {
                  endVertexId,
                  startVertexId: start.vertexId,
              }
            : {
                  endPosition,
                  startVertexId: start.vertexId,
              };
    }

    return endVertexId
        ? {
              endVertexId,
              startPosition: start.point,
          }
        : {
              endPosition,
              startPosition: start.point,
          };
}

function collectSketchVertexSnapSources(
    state: EditorState,
    sketch: Sketch,
    plane: Plane3,
    excludedVertexId: SketchVertexId | null,
): readonly SnapSource<SketchEntityRef>[] {
    const sources: SnapSource<SketchEntityRef>[] = [];

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

function getSnappedVertexId(snap: SnapResult<SketchEntityRef> | null): SketchVertexId | null {
    return snap?.sourceRef?.kind === SketchEntityKind.Vertex ? snap.sourceRef.id : null;
}
