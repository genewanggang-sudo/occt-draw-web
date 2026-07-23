import { createEditDraft } from '@occt-draw/core';
import { AddRegularPolygonRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    LineSegment3,
    RegularPolygon2,
    Vec2,
    Vec3,
    type Plane3,
    type RegularPolygonMode,
    type Vector2,
} from '@occt-draw/math';
import { sampleSketchCurveSegments, sketchPointToWorldOnPlane } from '@occt-draw/sketch';
import type { EditorState, SketchEditSession, SketchToolKind } from '../state/editorState';
import {
    CadCommand,
    createHandledCommandResult,
    createUnhandledCommandResult,
    type CommandContext,
    type CommandPointerEvent,
    type CommandResult,
} from './CadCommand';
import type { CommandId } from './commandTypes';
import { projectScreenPointToSketch2 } from './sketchProjection';
import { resolveActiveSketchTarget } from './sketchTargetContext';

export const DEFAULT_REGULAR_POLYGON_SIDE_COUNT = 6;

type RegularPolygonToolKind = Extract<
    SketchToolKind,
    'circumscribed-polygon' | 'inscribed-polygon'
>;

interface PendingRegularPolygonDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export interface SketchRegularPolygonCommandOptions {
    readonly id: Extract<CommandId, 'sketch-circumscribed-polygon' | 'sketch-inscribed-polygon'>;
    readonly mode: RegularPolygonMode;
    readonly toolKind: RegularPolygonToolKind;
}

export class SketchRegularPolygonCommand extends CadCommand {
    public readonly id: SketchRegularPolygonCommandOptions['id'];
    private readonly mode: RegularPolygonMode;
    private pendingDrag: PendingRegularPolygonDrag | null = null;
    private readonly toolKind: RegularPolygonToolKind;

    constructor(options: SketchRegularPolygonCommandOptions) {
        super();
        this.id = options.id;
        this.mode = options.mode;
        this.toolKind = options.toolKind;
    }

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: this.id,
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: {
                    center: null,
                    kind: this.toolKind,
                    sideCount: DEFAULT_REGULAR_POLYGON_SIDE_COUNT,
                },
            },
            commandSession: {
                id: this.id,
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
        const tool = getRegularPolygonTool(session, this.toolKind);
        this.pendingDrag = null;

        if (session && tool?.center) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { ...tool, center: null },
                },
                commandSession: {
                    id: this.id,
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
        const tool = getRegularPolygonTool(session, this.toolKind);
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!session || !tool || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!tool.center) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { ...tool, center: point },
                },
                commandSession: {
                    id: this.id,
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createRegularPolygonResult(context, session, point);
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
        const tool = getRegularPolygonTool(session, this.toolKind);
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.center || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        const draft = createRegularPolygonDraft(
            target.plane,
            tool.center,
            point,
            tool.sideCount,
            this.mode,
            this.id,
        );

        return createHandledCommandResult({
            draft,
        });
    }

    public override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = getRegularPolygonTool(session, this.toolKind);
        const target = session ? resolveActiveSketchTarget(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session || !tool?.center || !target || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return this.clearPendingRegularPolygonResult(context, session, tool.sideCount);
        }

        return this.createRegularPolygonResult(context, session, point);
    }

    private createRegularPolygonResult(
        context: CommandContext,
        session: SketchEditSession,
        referencePoint: Vector2,
    ): CommandResult {
        const state = context.getState();
        const tool = getRegularPolygonTool(session, this.toolKind);
        const center = tool?.center ?? null;

        if (!tool || !center) {
            return createUnhandledCommandResult();
        }

        const points = RegularPolygon2.create({
            center,
            mode: this.mode,
            referencePoint,
            sideCount: tool.sideCount,
        }).value?.points;

        if (!points) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { ...tool, center: null },
            },
            commandSession: {
                id: this.id,
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddRegularPolygonRequest({
                center,
                mode: this.mode,
                partStudioId: state.document.getActivePartStudio().id,
                referencePoint,
                sideCount: tool.sideCount,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }

    private clearPendingRegularPolygonResult(
        context: CommandContext,
        session: SketchEditSession,
        sideCount: number,
    ): CommandResult {
        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { center: null, kind: this.toolKind, sideCount },
            },
            commandSession: {
                id: this.id,
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            draft: null,
        });
    }
}

function createRegularPolygonDraft(
    plane: Plane3,
    center: Vector2,
    referencePoint: Vector2,
    sideCount: number,
    mode: RegularPolygonMode,
    commandId: CommandId,
) {
    const points = RegularPolygon2.create({
        center,
        mode,
        referencePoint,
        sideCount,
    }).value?.points;

    if (!points) {
        return null;
    }

    const referenceRadius = Vec2.distance(center, referencePoint);

    if (!Number.isFinite(referenceRadius) || referenceRadius <= 1e-6) {
        return null;
    }

    const polygonSegments = points.map((point, index) => {
        const next = points[(index + 1) % points.length] ?? point;

        return {
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:${commandId}:polygon-segment:${String(index)}`,
            kind: 'line-segment' as const,
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, point),
                sketchPointToWorldOnPlane(plane, next),
            ),
            visible: true,
        };
    });

    const referenceCircleSegments = sampleSketchCurveSegments({
        center,
        kind: 'circle',
        radius: referenceRadius,
    }).map((segment, index) => ({
        color: Vec3.of(0.1, 0.55, 1),
        id: `draft:${commandId}:reference-circle:${String(index)}`,
        kind: 'line-segment' as const,
        segment: new LineSegment3(
            sketchPointToWorldOnPlane(plane, segment.start),
            sketchPointToWorldOnPlane(plane, segment.end),
        ),
        showEndpointPoints: false,
        visible: true,
    }));

    return createEditDraft<CadDocument>({
        id: `draft:${commandId}`,
        kind: 'temporary',
    }).withTemporaryObjects([
        ...polygonSegments,
        ...referenceCircleSegments,
        {
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:${commandId}:center`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, center),
            visible: true,
        },
        {
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:${commandId}:reference`,
            kind: 'point' as const,
            point: sketchPointToWorldOnPlane(plane, referencePoint),
            visible: true,
        },
    ]);
}

function getRegularPolygonTool(
    session: SketchEditSession | null | undefined,
    kind: RegularPolygonToolKind,
) {
    return session?.tool.kind === kind ? session.tool : null;
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
