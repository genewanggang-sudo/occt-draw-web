import { createEditDraft } from '@occt-draw/core';
import {
    AddCircleRequest,
    findSketchByFeatureId,
    referencePlaneToPlane,
    type CadDocument,
} from '@occt-draw/cad-model';
import { LineSegment3, Vec2, Vec3, type Plane3, type Vector2 } from '@occt-draw/math';
import { sketchPointToWorldOnPlane, type Sketch } from '@occt-draw/sketch';
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

const MIN_CIRCLE_RADIUS = 1e-6;
const CIRCLE_DRAG_THRESHOLD_PIXELS = 3;
const CIRCLE_PREVIEW_SEGMENT_COUNT = 64;

interface PendingCircleDrag {
    readonly moved: boolean;
    readonly pointerId: number;
    readonly startPoint: CommandPointerEvent['point'];
}

export class SketchCircleCommand extends CadCommand {
    public readonly id = 'sketch-circle';
    private pendingDrag: PendingCircleDrag | null = null;

    public override enter(context: CommandContext): CommandResult {
        const state = context.getState();
        this.pendingDrag = null;

        if (!state.activeSketchSession) {
            return createHandledCommandResult({
                commandSession: {
                    id: 'sketch-circle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'blocked',
                },
            });
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...state.activeSketchSession,
                activeTool: 'circle',
                pendingCircleCenter: null,
                pendingAlignedRectangleEdge: null,
                pendingLineStart: null,
                pendingRectangleStart: null,
            },
            commandSession: {
                id: 'sketch-circle',
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

        if (session?.pendingCircleCenter) {
            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingCircleCenter: null,
                },
                commandSession: {
                    id: 'sketch-circle',
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
        this.pendingDrag = null;
        return createHandledCommandResult({
            draft: null,
        });
    }

    protected override onPointerCancel(): CommandResult {
        this.pendingDrag = null;
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

        if (!session.pendingCircleCenter) {
            this.pendingDrag = {
                moved: false,
                pointerId: event.pointerId,
                startPoint: event.point,
            };

            return createHandledCommandResult({
                activeSketchSession: {
                    ...session,
                    pendingCircleCenter: point,
                },
                commandSession: {
                    id: 'sketch-circle',
                    message: 'Sketch command updated.',
                    selectionContext: state.commandSession.selectionContext,
                    status: 'running',
                },
                draft: null,
            });
        }

        return this.createCircleResult(context, session, point);
    }

    protected override onPointerMove(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        if (this.pendingDrag?.pointerId === event.pointerId && !this.pendingDrag.moved) {
            this.pendingDrag = {
                ...this.pendingDrag,
                moved:
                    distanceScreenPoints(this.pendingDrag.startPoint, event.point) >
                    CIRCLE_DRAG_THRESHOLD_PIXELS,
            };
        }

        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;

        if (!session?.pendingCircleCenter || !activeSketch) {
            return createUnhandledCommandResult();
        }

        const plane = findSketchPlane(state, activeSketch.sketch);
        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!plane || !point) {
            return createUnhandledCommandResult();
        }

        const radius = Vec2.distance(session.pendingCircleCenter, point);

        if (radius <= MIN_CIRCLE_RADIUS) {
            return createUnhandledCommandResult();
        }

        return createHandledCommandResult({
            draft: createCircleDraft(plane, session.pendingCircleCenter, radius),
        });
    }

    protected override onPointerUp(
        event: CommandPointerEvent,
        context: CommandContext,
    ): CommandResult {
        const state = context.getState();
        const session = state.activeSketchSession;
        const activeSketch = session ? findActiveSketch(state, session) : null;
        const drag = this.pendingDrag?.pointerId === event.pointerId ? this.pendingDrag : null;
        this.pendingDrag = null;

        if (!session?.pendingCircleCenter || !activeSketch || !drag?.moved) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        const point = projectPointerToSketch(state, activeSketch.sketch, event);

        if (!point) {
            return createHandledCommandResult({
                message: 'Sketch command updated.',
            });
        }

        return this.createCircleResult(context, session, point);
    }

    private createCircleResult(
        context: CommandContext,
        session: SketchEditSession,
        point: Vector2,
    ): CommandResult {
        const state = context.getState();
        const center = session.pendingCircleCenter;

        if (!center) {
            return createUnhandledCommandResult();
        }

        const radius = Vec2.distance(center, point);

        if (radius <= MIN_CIRCLE_RADIUS) {
            return createHandledCommandResult();
        }

        return createHandledCommandResult({
            activeSketchSession: {
                ...session,
                pendingCircleCenter: null,
            },
            commandSession: {
                id: 'sketch-circle',
                message: 'Sketch command updated.',
                selectionContext: state.commandSession.selectionContext,
                status: 'running',
            },
            documentRequest: new AddCircleRequest({
                center,
                partStudioId: state.document.getActivePartStudio().id,
                radius,
                sketchFeatureId: session.sketchFeatureId,
            }),
            draft: null,
        });
    }
}

function createCircleDraft(plane: Plane3, center: Vector2, radius: number) {
    return createEditDraft<CadDocument>({
        id: 'draft:sketch-circle',
        kind: 'temporary',
    }).withTemporaryObjects(
        sampleCircleSegments(center, radius).map((segment, index) => ({
            color: Vec3.of(0.1, 0.55, 1),
            id: `draft:sketch-circle:segment:${String(index)}`,
            kind: 'line-segment',
            segment: new LineSegment3(
                sketchPointToWorldOnPlane(plane, segment.start),
                sketchPointToWorldOnPlane(plane, segment.end),
            ),
            visible: true,
        })),
    );
}

function sampleCircleSegments(
    center: Vector2,
    radius: number,
): readonly { readonly end: Vector2; readonly start: Vector2 }[] {
    const segments: { readonly end: Vector2; readonly start: Vector2 }[] = [];

    for (let index = 0; index < CIRCLE_PREVIEW_SEGMENT_COUNT; index += 1) {
        const startAngle = (index / CIRCLE_PREVIEW_SEGMENT_COUNT) * Math.PI * 2;
        const endAngle = ((index + 1) / CIRCLE_PREVIEW_SEGMENT_COUNT) * Math.PI * 2;

        segments.push({
            start: pointOnCircle(center, radius, startAngle),
            end: pointOnCircle(center, radius, endAngle),
        });
    }

    return segments;
}

function pointOnCircle(center: Vector2, radius: number, angleRadians: number): Vector2 {
    return Vec2.of(
        center.x + Math.cos(angleRadians) * radius,
        center.y + Math.sin(angleRadians) * radius,
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
        planeObjectRef: sketch.plane.planeObjectRef,
        point: event.point,
        viewportSize: state.navigation.viewportSize,
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
    const object = state.document
        .getActivePartStudio()
        .findObjectById(sketch.plane.planeObjectRef.id);

    return object?.kind === 'reference-plane' ? referencePlaneToPlane(object) : null;
}

function distanceScreenPoints(
    first: CommandPointerEvent['point'],
    second: CommandPointerEvent['point'],
): number {
    return Math.hypot(second.x - first.x, second.y - first.y);
}
