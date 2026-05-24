import { createEditDraft } from '@occt-draw/core';
import {
    findSketchByFeatureId,
    referencePlaneToPlane,
    SetFeaturePayloadRequest,
    type CadDocument,
} from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import {
    AddCornerRectangleRequest,
    sketchPointToWorldOnPlane,
    type Sketch,
} from '@occt-draw/sketch';
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

const MIN_RECTANGLE_SIDE = 1e-6;

export class SketchRectangleCommand extends CadCommand {
    public readonly id = 'sketch-rectangle';

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'rectangle',
                pendingLineStart: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-rectangle',
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

        if (session?.pendingRectangleStart) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingRectangleStart: null,
                },
                commandSession: {
                    id: 'sketch-rectangle',
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

        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        if (!session.pendingRectangleStart) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingRectangleStart: point,
                },
                commandSession: {
                    id: 'sketch-rectangle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createRectangleResult(context, activeSketch.sketch, session, point, event);
    }

    public override pointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingRectangleStart || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const plane = findSketchPlane(state, activeSketch.sketch);
        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!plane || !point) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createRectangleDraft(
                plane,
                session.pendingRectangleStart,
                event.altKey
                    ? constrainOppositeCornerToSquare(session.pendingRectangleStart, point)
                    : point,
            ),
        });
    }

    public override pointerUp(event: CommandPointerEvent, context: CommandContext): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingRectangleStart || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!point || !isValidRectangle(session.pendingRectangleStart, point)) {
            return createHandledCommandResult();
        }

        return this.createRectangleResult(context, activeSketch.sketch, session, point, event);
    }

    private createRectangleResult(
        context: CommandContext,
        sourceSketch: Sketch,
        session: SketchEditSession,
        point: Vector2,
        event: CommandPointerEvent,
    ): CommandResult {
        const state = context.getState();
        const firstCorner = session.pendingRectangleStart;

        if (!firstCorner) {
            return createUnhandledCommandResult();
        }

        const oppositeCorner = event.altKey
            ? constrainOppositeCornerToSquare(firstCorner, point)
            : point;

        if (!isValidRectangle(firstCorner, oppositeCorner)) {
            return createHandledCommandResult();
        }

        const sketch = sourceSketch.clone();
        const request = new AddCornerRectangleRequest({
            firstCorner,
            oppositeCorner,
        });
        const operation = request.createOperation();

        operation.apply(sketch);

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-rectangle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: createSetSketchPayloadRequest(state, sketch),
            draft: null,
        });
    }
}

function createRectangleDraft(plane: Plane3, firstCorner: Vector2, oppositeCorner: Vector2) {
    const segments = getRectangleSegments(plane, firstCorner, oppositeCorner);

    return createEditDraft<CadDocument>({
        id: 'draft:sketch-rectangle',
        kind: 'sketch',
    }).withTemporaryObjects(
        segments.map((segment, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-rectangle:segment:${String(index)}`,
            kind: 'line-segment',
            segment,
            visible: true,
        })),
    );
}

function getRectangleSegments(
    plane: Plane3,
    firstCorner: Vector2,
    oppositeCorner: Vector2,
): readonly LineSegment3[] {
    const corners = getCornerRectanglePoints(firstCorner, oppositeCorner);

    return corners.map((corner, index) => {
        const next = corners[(index + 1) % corners.length] ?? corner;

        return new LineSegment3(
            sketchPointToWorldOnPlane(plane, corner),
            sketchPointToWorldOnPlane(plane, next),
        );
    });
}

function getCornerRectanglePoints(
    firstCorner: Vector2,
    oppositeCorner: Vector2,
): readonly Vector2[] {
    return [
        firstCorner,
        Vec2.of(oppositeCorner.x, firstCorner.y),
        oppositeCorner,
        Vec2.of(firstCorner.x, oppositeCorner.y),
    ];
}

function constrainOppositeCornerToSquare(start: Vector2, raw: Vector2): Vector2 {
    const dx = raw.x - start.x;
    const dy = raw.y - start.y;
    const side = Math.min(Math.abs(dx), Math.abs(dy));

    return Vec2.of(start.x + Math.sign(dx || 1) * side, start.y + Math.sign(dy || 1) * side);
}

function isValidRectangle(firstCorner: Vector2, oppositeCorner: Vector2): boolean {
    return (
        Math.abs(oppositeCorner.x - firstCorner.x) > MIN_RECTANGLE_SIDE &&
        Math.abs(oppositeCorner.y - firstCorner.y) > MIN_RECTANGLE_SIDE
    );
}

function projectPointerToSketch(
    state: EditorState,
    sketch: Sketch,
    event: CommandPointerEvent,
): Vector2 | null {
    return projectScreenPointToSketch2({
        camera: state.navigation.camera,
        partStudio: state.document.getActivePartStudio(),
        planeRef: sketch.planeRef,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
    });
}

function createSetSketchPayloadRequest(
    state: EditorState,
    sketch: Sketch,
): SetFeaturePayloadRequest {
    const partStudio = state.document.getActivePartStudio();

    return new SetFeaturePayloadRequest({
        label: `Update ${sketch.name}`,
        partStudioId: partStudio.id,
        payload: sketch,
        payloadId: sketch.id,
        transactionId: `set-sketch-payload:${sketch.id}`,
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
