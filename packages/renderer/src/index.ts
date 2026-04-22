import type {
    ArcEntity,
    DraftToolState,
    DrawingDocument,
    EntityId,
    LineEntity,
    Point2D,
    PolylineEntity,
    ViewportState,
} from '@occt-draw/core';

export interface CanvasSize {
    height: number;
    width: number;
}

export interface RenderDocumentOptions {
    draftState?: DraftToolState;
    selectedEntityIds?: readonly EntityId[];
}

const BACKGROUND_COLOR = '#f8fbff';
const GRID_COLOR = '#d5dfef';
const GRID_BOLD_COLOR = '#b8c7de';
const DEFAULT_STROKE_COLOR = '#123861';
const SELECTED_STROKE_COLOR = '#d95c1a';
const DRAFT_STROKE_COLOR = '#0f7b66';

export function worldToScreen(
    point: Point2D,
    viewport: ViewportState,
    canvasSize: CanvasSize,
): Point2D {
    return {
        x: (point.x - viewport.center.x) * viewport.zoom + canvasSize.width / 2,
        y: (point.y - viewport.center.y) * viewport.zoom + canvasSize.height / 2,
    };
}

export function screenToWorld(
    point: Point2D,
    viewport: ViewportState,
    canvasSize: CanvasSize,
): Point2D {
    return {
        x: (point.x - canvasSize.width / 2) / viewport.zoom + viewport.center.x,
        y: (point.y - canvasSize.height / 2) / viewport.zoom + viewport.center.y,
    };
}

export function clearCanvas(
    context: CanvasRenderingContext2D,
    canvasSize: CanvasSize = {
        height: context.canvas.height,
        width: context.canvas.width,
    },
) {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.restore();
}

export function renderDocument(
    context: CanvasRenderingContext2D,
    document: DrawingDocument,
    viewport: ViewportState,
    options: RenderDocumentOptions = {},
) {
    const canvasSize = {
        height: context.canvas.height,
        width: context.canvas.width,
    };
    const selectedEntityIds = new Set(options.selectedEntityIds ?? []);

    clearCanvas(context, canvasSize);
    drawGrid(context, viewport, canvasSize);

    for (const entity of document.entities) {
        if (!entity.visible) {
            continue;
        }

        const isSelected = selectedEntityIds.has(entity.id);

        if (entity.type === 'line') {
            drawLineEntity(context, entity, viewport, canvasSize, isSelected);
            continue;
        }

        if (entity.type === 'arc') {
            drawArcEntity(context, entity, viewport, canvasSize, isSelected);
            continue;
        }

        drawPolylineEntity(context, entity, viewport, canvasSize, isSelected);
    }

    if (options.draftState) {
        drawDraftState(context, options.draftState, viewport, canvasSize);
    }
}

export function drawLineEntity(
    context: CanvasRenderingContext2D,
    entity: LineEntity,
    viewport: ViewportState,
    canvasSize: CanvasSize,
    isSelected = false,
) {
    const startPoint = worldToScreen(entity.start, viewport, canvasSize);
    const endPoint = worldToScreen(entity.end, viewport, canvasSize);

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = isSelected ? SELECTED_STROKE_COLOR : entity.style.strokeColor;
    context.lineWidth = Math.max(1.5, entity.style.strokeWidth + (isSelected ? 1 : 0));
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
    context.restore();
}

export function drawArcEntity(
    context: CanvasRenderingContext2D,
    entity: ArcEntity,
    viewport: ViewportState,
    canvasSize: CanvasSize,
    isSelected = false,
) {
    const centerPoint = worldToScreen(entity.center, viewport, canvasSize);

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = isSelected ? SELECTED_STROKE_COLOR : entity.style.strokeColor;
    context.lineWidth = Math.max(1.5, entity.style.strokeWidth + (isSelected ? 1 : 0));
    context.beginPath();
    context.arc(
        centerPoint.x,
        centerPoint.y,
        entity.radius * viewport.zoom,
        entity.startAngle,
        entity.endAngle,
        entity.counterClockwise,
    );
    context.stroke();
    context.restore();
}

export function drawPolylineEntity(
    context: CanvasRenderingContext2D,
    entity: PolylineEntity,
    viewport: ViewportState,
    canvasSize: CanvasSize,
    isSelected = false,
) {
    if (entity.points.length < 2) {
        return;
    }

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = isSelected ? SELECTED_STROKE_COLOR : entity.style.strokeColor;
    context.lineWidth = Math.max(1.5, entity.style.strokeWidth + (isSelected ? 1 : 0));
    context.beginPath();

    entity.points.forEach((point, index) => {
        const screenPoint = worldToScreen(point, viewport, canvasSize);

        if (index === 0) {
            context.moveTo(screenPoint.x, screenPoint.y);
            return;
        }

        context.lineTo(screenPoint.x, screenPoint.y);
    });

    context.stroke();
    context.restore();
}

export function hitTestDocument(
    document: DrawingDocument,
    point: Point2D,
    tolerance: number,
): EntityId | null {
    const visibleEntities = [...document.entities].reverse();

    for (const entity of visibleEntities) {
        if (!entity.visible) {
            continue;
        }

        if (entity.type === 'line' && hitTestLineEntity(entity, point, tolerance)) {
            return entity.id;
        }

        if (entity.type === 'arc' && hitTestArcEntity(entity, point, tolerance)) {
            return entity.id;
        }

        if (entity.type === 'polyline' && hitTestPolylineEntity(entity, point, tolerance)) {
            return entity.id;
        }
    }

    return null;
}

function drawGrid(
    context: CanvasRenderingContext2D,
    viewport: ViewportState,
    canvasSize: CanvasSize,
) {
    const baseGridSize = getGridSize(viewport.zoom);
    const horizontalStart = Math.floor(
        (viewport.center.x - canvasSize.width / 2 / viewport.zoom) / baseGridSize,
    );
    const horizontalEnd = Math.ceil(
        (viewport.center.x + canvasSize.width / 2 / viewport.zoom) / baseGridSize,
    );
    const verticalStart = Math.floor(
        (viewport.center.y - canvasSize.height / 2 / viewport.zoom) / baseGridSize,
    );
    const verticalEnd = Math.ceil(
        (viewport.center.y + canvasSize.height / 2 / viewport.zoom) / baseGridSize,
    );

    context.save();

    for (let xIndex = horizontalStart; xIndex <= horizontalEnd; xIndex += 1) {
        const worldX = xIndex * baseGridSize;
        const screenPoint = worldToScreen({ x: worldX, y: 0 }, viewport, canvasSize);

        context.strokeStyle = xIndex % 5 === 0 ? GRID_BOLD_COLOR : GRID_COLOR;
        context.lineWidth = xIndex % 5 === 0 ? 1.2 : 1;
        context.beginPath();
        context.moveTo(screenPoint.x, 0);
        context.lineTo(screenPoint.x, canvasSize.height);
        context.stroke();
    }

    for (let yIndex = verticalStart; yIndex <= verticalEnd; yIndex += 1) {
        const worldY = yIndex * baseGridSize;
        const screenPoint = worldToScreen({ x: 0, y: worldY }, viewport, canvasSize);

        context.strokeStyle = yIndex % 5 === 0 ? GRID_BOLD_COLOR : GRID_COLOR;
        context.lineWidth = yIndex % 5 === 0 ? 1.2 : 1;
        context.beginPath();
        context.moveTo(0, screenPoint.y);
        context.lineTo(canvasSize.width, screenPoint.y);
        context.stroke();
    }

    context.strokeStyle = DEFAULT_STROKE_COLOR;
    context.lineWidth = 1.5;
    context.setLineDash([8, 8]);
    const horizontalAxis = worldToScreen({ x: 0, y: 0 }, viewport, canvasSize);

    context.beginPath();
    context.moveTo(horizontalAxis.x, 0);
    context.lineTo(horizontalAxis.x, canvasSize.height);
    context.stroke();

    context.beginPath();
    context.moveTo(0, horizontalAxis.y);
    context.lineTo(canvasSize.width, horizontalAxis.y);
    context.stroke();

    context.restore();
}

function getGridSize(zoom: number): number {
    if (zoom >= 4) {
        return 10;
    }

    if (zoom >= 2) {
        return 20;
    }

    if (zoom >= 1) {
        return 50;
    }

    if (zoom >= 0.5) {
        return 100;
    }

    return 200;
}

function drawDraftState(
    context: CanvasRenderingContext2D,
    draftState: DraftToolState,
    viewport: ViewportState,
    canvasSize: CanvasSize,
) {
    if (draftState.tool === 'draw-line' && draftState.start && draftState.current) {
        drawDraftLine(context, draftState.start, draftState.current, viewport, canvasSize);
        return;
    }

    if (draftState.tool === 'draw-arc' && draftState.center) {
        drawDraftArc(context, draftState, viewport, canvasSize);
        return;
    }

    if (draftState.tool === 'draw-polyline' && draftState.points.length > 0) {
        drawDraftPolyline(context, draftState, viewport, canvasSize);
    }
}

function drawDraftLine(
    context: CanvasRenderingContext2D,
    start: Point2D,
    end: Point2D,
    viewport: ViewportState,
    canvasSize: CanvasSize,
) {
    const startPoint = worldToScreen(start, viewport, canvasSize);
    const endPoint = worldToScreen(end, viewport, canvasSize);

    context.save();
    context.strokeStyle = DRAFT_STROKE_COLOR;
    context.lineWidth = 2;
    context.setLineDash([10, 6]);
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
    context.restore();
}

function drawDraftArc(
    context: CanvasRenderingContext2D,
    draftState: Extract<DraftToolState, { tool: 'draw-arc' }>,
    viewport: ViewportState,
    canvasSize: CanvasSize,
) {
    const center = draftState.center;

    if (!center) {
        return;
    }

    const centerPoint = worldToScreen(center, viewport, canvasSize);

    context.save();
    context.strokeStyle = DRAFT_STROKE_COLOR;
    context.fillStyle = DRAFT_STROKE_COLOR;
    context.lineWidth = 2;
    context.setLineDash([10, 6]);

    context.beginPath();
    context.arc(centerPoint.x, centerPoint.y, 4, 0, Math.PI * 2);
    context.fill();

    if (!draftState.current) {
        context.restore();
        return;
    }

    if (!draftState.startPoint) {
        const radiusPoint = worldToScreen(draftState.current, viewport, canvasSize);

        context.beginPath();
        context.moveTo(centerPoint.x, centerPoint.y);
        context.lineTo(radiusPoint.x, radiusPoint.y);
        context.stroke();
        context.restore();
        return;
    }

    const startPoint = draftState.startPoint;
    const radius = distanceBetween(center, startPoint);

    if (radius < 0.0001) {
        context.restore();
        return;
    }

    const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
    const endAngle = Math.atan2(draftState.current.y - center.y, draftState.current.x - center.x);
    const counterClockwise = normalizeAngle(endAngle - startAngle) > Math.PI;

    context.beginPath();
    context.arc(
        centerPoint.x,
        centerPoint.y,
        radius * viewport.zoom,
        startAngle,
        endAngle,
        counterClockwise,
    );
    context.stroke();
    context.restore();
}

function drawDraftPolyline(
    context: CanvasRenderingContext2D,
    draftState: Extract<DraftToolState, { tool: 'draw-polyline' }>,
    viewport: ViewportState,
    canvasSize: CanvasSize,
) {
    const points = draftState.current
        ? [...draftState.points, draftState.current]
        : [...draftState.points];

    if (points.length === 0) {
        return;
    }

    context.save();
    context.strokeStyle = DRAFT_STROKE_COLOR;
    context.fillStyle = DRAFT_STROKE_COLOR;
    context.lineWidth = 2;
    context.setLineDash([10, 6]);
    context.beginPath();

    points.forEach((point, index) => {
        const screenPoint = worldToScreen(point, viewport, canvasSize);

        if (index === 0) {
            context.moveTo(screenPoint.x, screenPoint.y);
            return;
        }

        context.lineTo(screenPoint.x, screenPoint.y);
    });

    context.stroke();

    for (const point of draftState.points) {
        const screenPoint = worldToScreen(point, viewport, canvasSize);

        context.beginPath();
        context.arc(screenPoint.x, screenPoint.y, 3.5, 0, Math.PI * 2);
        context.fill();
    }

    context.restore();
}

function hitTestLineEntity(entity: LineEntity, point: Point2D, tolerance: number): boolean {
    return distanceToSegment(point, entity.start, entity.end) <= tolerance;
}

function hitTestPolylineEntity(entity: PolylineEntity, point: Point2D, tolerance: number): boolean {
    if (entity.points.length < 2) {
        return false;
    }

    for (let index = 0; index < entity.points.length - 1; index += 1) {
        const startPoint = entity.points[index];
        const endPoint = entity.points[index + 1];

        if (!startPoint || !endPoint) {
            continue;
        }

        if (distanceToSegment(point, startPoint, endPoint) <= tolerance) {
            return true;
        }
    }

    return false;
}

function hitTestArcEntity(entity: ArcEntity, point: Point2D, tolerance: number): boolean {
    const radiusDelta = Math.abs(distanceBetween(entity.center, point) - entity.radius);

    if (radiusDelta > tolerance) {
        return false;
    }

    const angle = Math.atan2(point.y - entity.center.y, point.x - entity.center.x);

    return isAngleOnArc(angle, entity.startAngle, entity.endAngle, entity.counterClockwise);
}

function isAngleOnArc(
    angle: number,
    startAngle: number,
    endAngle: number,
    counterClockwise: boolean,
): boolean {
    const normalizedAngle = normalizeAngle(angle);
    const normalizedStart = normalizeAngle(startAngle);
    const normalizedEnd = normalizeAngle(endAngle);

    if (!counterClockwise) {
        return (
            normalizeAngle(normalizedAngle - normalizedStart) <=
            normalizeAngle(normalizedEnd - normalizedStart)
        );
    }

    return (
        normalizeAngle(normalizedStart - normalizedAngle) <=
        normalizeAngle(normalizedStart - normalizedEnd)
    );
}

function distanceToSegment(point: Point2D, startPoint: Point2D, endPoint: Point2D): number {
    const segmentX = endPoint.x - startPoint.x;
    const segmentY = endPoint.y - startPoint.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSquared === 0) {
        return distanceBetween(point, startPoint);
    }

    const projectionRatio =
        ((point.x - startPoint.x) * segmentX + (point.y - startPoint.y) * segmentY) /
        segmentLengthSquared;
    const clampedProjectionRatio = Math.min(Math.max(projectionRatio, 0), 1);
    const projectedPoint = {
        x: startPoint.x + segmentX * clampedProjectionRatio,
        y: startPoint.y + segmentY * clampedProjectionRatio,
    };

    return distanceBetween(point, projectedPoint);
}

function distanceBetween(startPoint: Point2D, endPoint: Point2D): number {
    return Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
}

function normalizeAngle(angle: number): number {
    const fullTurn = Math.PI * 2;
    const normalizedAngle = angle % fullTurn;

    return normalizedAngle >= 0 ? normalizedAngle : normalizedAngle + fullTurn;
}
