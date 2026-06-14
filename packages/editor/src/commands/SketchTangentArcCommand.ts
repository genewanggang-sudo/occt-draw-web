import { projectWorldToScreen } from '@occt-draw/canvas';
import { createEditDraft } from '@occt-draw/core';
import {
    AddTangentArcRequest,
    type CadDocument,
    type SketchEditTarget,
} from '@occt-draw/cad-model';
import {
    Arc2,
    LineSegment3,
    Vec2,
    Vec3,
    sampleCurveSegments2,
    type Plane3,
    type Vector2,
} from '@occt-draw/math';
import {
    Arc2D,
    Conic2D,
    EllipticalArc2D,
    Line2D,
    SketchEntityKind,
    sketchPointToWorldOnPlane,
    type Sketch,
    type SketchEntityRef,
    type SketchVertexId,
} from '@occt-draw/sketch';
import { SnapService, type SnapResult, type SnapSource } from '@occt-draw/snapping';
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
import { resolveActiveSketchTarget } from './sketchTargetContext';

const TANGENT_ARC_PREVIEW_SEGMENTS = 32;
const TANGENT_ARC_SNAP_THRESHOLD_PIXELS = 9;
const DRAFT_COLOR = Vec3.of(0.1, 0.55, 1);
const SNAP_COLOR = Vec3.of(1, 0.72, 0.18);

export class SketchTangentArcCommand extends CadCommand {
    public readonly id = 'sketch-tangent-arc';
    private readonly snapService = new SnapService();

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-tangent-arc',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: createEmptyTool(),
            },
            commandSession: createRunningSession(state),
            draft: null,
        });
    }

    public override cancel(context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;

        if (
            session?.tool.kind === 'tangent-arc' &&
            (session.tool.startPoint || session.tool.startTangent || session.tool.startVertexId)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: createEmptyTool(),
                },
                commandSession: createRunningSession(state),
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
        return createHandledCommandResult({ draft: null });
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
        const tool = session?.tool.kind === 'tangent-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        if (!tool.startPoint || !tool.startTangent || !tool.startVertexId) {
            return this.createStartResult(context, session, target, event);
        }

        const endPoint = projectPointerToSketch(state, target.plane, event);

        if (!endPoint) {
            return createHandledCommandResult({ message: 'Sketch command updated.' });
        }

        return this.createArcResult(
            context,
            session,
            tool.startVertexId,
            tool.startPoint,
            tool.startTangent,
            endPoint,
        );
    }

    public override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'tangent-arc' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!target) {
            return createUnhandledCommandResult();
        }

        if (!tool?.startPoint || !tool.startTangent || !tool.startVertexId) {
            const resolved = this.resolveVertexPoint(context, target, event);

            if (!resolved.snap) {
                return createHandledCommandResult({ draft: null });
            }

            return createHandledCommandResult({
                draft: createSnapDraft(target.plane, resolved.snap.point),
            });
        }

        const endPoint = projectPointerToSketch(state, target.plane, event);

        if (!endPoint) {
            return createUnhandledCommandResult();
        }

        const arc = Arc2.fromStartEndTangent(tool.startPoint, endPoint, tool.startTangent);

        return createHandledCommandResult({
            draft: createArcDraft(
                target.plane,
                arc,
                arc ? [tool.startPoint, endPoint, arc.circle.center] : [tool.startPoint, endPoint],
            ),
        });
    }

    private createStartResult(
        context: CommandContext,
        session: SketchEditSession,
        target: SketchEditTarget,
        event: CommandPointerEvent,
    ): CommandResult {
        const state = context.getState();
        const resolved = this.resolveVertexPoint(context, target, event);
        const vertexId = getSnappedVertexId(resolved.snap);

        if (!vertexId) {
            return createHandledCommandResult({
                message: 'Start tangent arc from an existing sketch endpoint.',
                draft: null,
            });
        }

        const tangent = resolveOutgoingTangent(target.sketch, vertexId);
        const point = target.sketch.findPointForVertex(vertexId)?.position ?? null;

        if (!point || !tangent) {
            return createHandledCommandResult({
                message: 'Selected endpoint has no tangent source.',
                draft: null,
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: {
                    kind: 'tangent-arc',
                    startPoint: point,
                    startTangent: tangent,
                    startVertexId: vertexId,
                },
            },
            commandSession: createRunningSession(state),
            draft: createSnapDraft(target.plane, point),
        });
    }

    private createArcResult(
        context: CommandContext,
        session: SketchEditSession,
        startVertexId: SketchVertexId,
        startPoint: Vector2,
        startTangent: Vector2,
        endPoint: Vector2,
    ): CommandResult {
        if (!Arc2.fromStartEndTangent(startPoint, endPoint, startTangent)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: createEmptyTool(),
            },
            commandSession: createRunningSession(state),
            documentRequest: new AddTangentArcRequest({
                endPoint,
                partStudioId: state.document.getActivePartStudio().id,
                sketchFeatureId: session.sketchFeatureId,
                startTangent,
                startVertexId,
            }),
            draft: null,
        });
    }

    private resolveVertexPoint(
        context: CommandContext,
        target: SketchEditTarget,
        event: CommandPointerEvent,
    ): {
        readonly rawPoint: Vector2 | null;
        readonly snap: SnapResult<SketchEntityRef> | null;
    } {
        const state = context.getState();
        const rawPoint = projectPointerToSketch(state, target.plane, event);

        if (!rawPoint) {
            return { rawPoint, snap: null };
        }

        return {
            rawPoint,
            snap: this.snapService.resolve({
                enabledKinds: ['vertex'],
                candidates: collectSketchVertexSnapSources(state, target.sketch, target.plane),
                pointerPoint: event.point,
                rawSketchPoint: rawPoint,
                thresholdPixels: TANGENT_ARC_SNAP_THRESHOLD_PIXELS,
            }),
        };
    }
}

function resolveOutgoingTangent(sketch: Sketch, vertexId: SketchVertexId): Vector2 | null {
    for (const edge of sketch.entities.topology.edges.list()) {
        if (edge.startVertexId !== vertexId && edge.endVertexId !== vertexId) {
            continue;
        }

        const curve = sketch.entities.geometry.curves.get(edge.curveId);
        const atEnd = edge.endVertexId === vertexId;

        if (curve instanceof Line2D) {
            return atEnd ? curve.direction : Vec2.from(curve.direction).scale(-1);
        }

        if (curve instanceof Arc2D) {
            const tangent = curve.arc.tangentAt(atEnd ? 1 : 0);

            return atEnd ? tangent : Vec2.from(tangent).scale(-1);
        }

        if (curve instanceof EllipticalArc2D) {
            const tangent = curve.arc.tangentAt(atEnd ? 1 : 0);

            return atEnd ? tangent : Vec2.from(tangent).scale(-1);
        }

        if (curve instanceof Conic2D) {
            const tangent = curve.conic.tangentAt(atEnd ? 1 : 0);

            return atEnd ? tangent : Vec2.from(tangent).scale(-1);
        }
    }

    return null;
}

function collectSketchVertexSnapSources(
    state: EditorState,
    sketch: Sketch,
    plane: Plane3,
): readonly SnapSource<SketchEntityRef>[] {
    const sources: SnapSource<SketchEntityRef>[] = [];

    for (const vertex of sketch.entities.topology.vertices.list()) {
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

function createArcDraft(plane: Plane3, arc: Arc2 | null, definitionPoints: readonly Vector2[]) {
    if (!arc) {
        return null;
    }

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-tangent-arc',
        kind: 'temporary',
    }).withTemporaryObjects([
        ...sampleCurveSegments2(arc, {
            closed: false,
            segments: TANGENT_ARC_PREVIEW_SEGMENTS,
        }).map((segment, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-tangent-arc:segment:${String(index)}`,
            kind: 'line-segment' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            showEndpointPoints: false,
            visible: true,
        })),
        ...definitionPoints.map((point, index) => ({
            color: DRAFT_COLOR,
            id: `draft:sketch-tangent-arc:point:${String(index)}`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        })),
    ]);
}

function createSnapDraft(plane: Plane3, point: Vector2) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-tangent-arc:snap',
        kind: 'temporary',
    }).withTemporaryObjects([
        {
            color: SNAP_COLOR,
            id: 'draft:sketch-tangent-arc:snap-point',
            kind: 'point',
            point: sketchPointToWorldOnPlane(plane, point),
            visible: true,
        },
    ]);
}

function createEmptyTool() {
    return {
        kind: 'tangent-arc' as const,
        startPoint: null,
        startTangent: null,
        startVertexId: null,
    };
}

function createRunningSession(state: EditorState) {
    return {
        id: 'sketch-tangent-arc' as const,
        message: 'Sketch command updated.',
        selectionContext: state.commandSession.selectionContext,
        status: 'running' as const,
    };
}

function getSnappedVertexId(snap: SnapResult<SketchEntityRef> | null): SketchVertexId | null {
    return snap?.sourceRef?.kind === SketchEntityKind.Vertex ? snap.sourceRef.id : null;
}

function projectPointerToSketch(
    state: EditorState,
    plane: Plane3,
    event: CommandPointerEvent,
): Vector2 | null {
    return projectScreenPointToSketch2({
        camera: state.navigation.camera,
        plane,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
    });
}
