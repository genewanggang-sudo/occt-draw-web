import { createEditDraft } from '@occt-draw/core';
import { AddEllipseRequest, type CadDocument } from '@occt-draw/cad-model';
import {
    Ellipse2,
    LineSegment3,
    Vec3,
    sampleCurveSegments2,
    type Plane3,
    type Vector2,
} from '@occt-draw/math';
import { sketchPointToWorldOnPlane } from '@occt-draw/sketch';
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

const ELLIPSE_PREVIEW_SEGMENTS = 64;

export class SketchEllipseCommand extends CadCommand {
    public readonly id = 'sketch-ellipse';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                tool: { firstAxisPoint: null, kind: 'ellipse', secondAxisPoint: null },
            },
            commandSession: {
                id: 'sketch-ellipse',
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

        if (
            session?.tool.kind === 'ellipse' &&
            (session.tool.firstAxisPoint || session.tool.secondAxisPoint)
        ) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { firstAxisPoint: null, kind: 'ellipse', secondAxisPoint: null },
                },
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return createHandledCommandResult({
            activeSketchSession: null,
            commandSession: {
                id: 'select',
                message: 'Sketch command updated.',
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

    protected override onPointerCancel(): CommandResult {
        return createHandledCommandResult({
            draft: null,
        });
    }

    protected override onPointerDown(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (event.button !== 0) {
            return createUnhandledCommandResult();
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'ellipse' ? session.tool : null;
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

        if (!tool.firstAxisPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: { firstAxisPoint: point, kind: 'ellipse', secondAxisPoint: null },
                },
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        if (!tool.secondAxisPoint) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    tool: {
                        firstAxisPoint: tool.firstAxisPoint,
                        kind: 'ellipse',
                        secondAxisPoint: point,
                    },
                },
                commandSession: {
                    id: 'sketch-ellipse',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createEllipseResult(
            context,
            session,
            tool.firstAxisPoint,
            tool.secondAxisPoint,
            point,
        );
    }

    protected override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const tool = session?.tool.kind === 'ellipse' ? session.tool : null;
        const target = session ? resolveActiveSketchTarget(state, session) : null;

        if (!tool?.firstAxisPoint || !tool.secondAxisPoint || !target) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, target.plane, event);

        if (!point) {
            return createUnhandledCommandResult();
        }

        const ellipse = Ellipse2.fromAxisPoints(tool.firstAxisPoint, tool.secondAxisPoint, point);

        if (!ellipse) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createEllipseDraft(target.plane, ellipse),
        });
    }

    private createEllipseResult(
        context: CommandContext,
        session: SketchEditSession,
        firstAxisPoint: Vector2,
        secondAxisPoint: Vector2,
        minorPoint: Vector2,
    ): CommandResult {
        if (!Ellipse2.fromAxisPoints(firstAxisPoint, secondAxisPoint, minorPoint)) {
            return createHandledCommandResult();
        }

        const state = context.getState();

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                tool: { firstAxisPoint: null, kind: 'ellipse', secondAxisPoint: null },
            },
            commandSession: {
                id: 'sketch-ellipse',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddEllipseRequest({
                firstAxisPoint,
                minorPoint,
                partStudioId: state.document.getActivePartStudio().id,
                secondAxisPoint,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }
}

function createEllipseDraft(plane: Plane3, ellipse: Ellipse2) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-ellipse',
        kind: 'temporary',
    }).withTemporaryObjects(
        sampleCurveSegments2(ellipse, { closed: true, segments: ELLIPSE_PREVIEW_SEGMENTS }).map(
            (segment, index) => ({
                color: Vec3.of(0.1, 0.55, 1),
                id: `draft:sketch-ellipse:segment:${String(index)}`,
                kind: 'line-segment',
                segment: new LineSegment3(
                    sketchPointToWorldOnPlane(plane, segment.start),
                    sketchPointToWorldOnPlane(plane, segment.end),
                ),
                visible: true,
            }),
        ),
    );
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
