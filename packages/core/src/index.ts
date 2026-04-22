export type DocumentId = string;
export type EntityId = string;
export type DrawingEntityType = 'arc' | 'line' | 'polyline';
export type EditorTool = 'draw-arc' | 'draw-line' | 'draw-polyline' | 'select';

export interface Point2D {
    x: number;
    y: number;
}

export interface EntityStyle {
    strokeColor: string;
    strokeWidth: number;
}

export interface BaseEntity {
    id: EntityId;
    style: EntityStyle;
    type: DrawingEntityType;
    visible: boolean;
}

export interface LineEntity extends BaseEntity {
    end: Point2D;
    start: Point2D;
    type: 'line';
}

export interface ArcEntity extends BaseEntity {
    center: Point2D;
    counterClockwise: boolean;
    endAngle: number;
    radius: number;
    startAngle: number;
    type: 'arc';
}

export interface PolylineEntity extends BaseEntity {
    points: readonly Point2D[];
    type: 'polyline';
}

export type DrawingEntity = ArcEntity | LineEntity | PolylineEntity;

export interface DrawingDocument {
    entities: readonly DrawingEntity[];
    id: DocumentId;
    name: string;
}

export interface SelectionState {
    entityIds: readonly EntityId[];
}

export interface ViewportState {
    center: Point2D;
    zoom: number;
}

export interface SelectDraftToolState {
    tool: 'select';
}

export interface LineDraftToolState {
    current?: Point2D;
    start?: Point2D;
    tool: 'draw-line';
}

export interface ArcDraftToolState {
    center?: Point2D;
    current?: Point2D;
    startPoint?: Point2D;
    tool: 'draw-arc';
}

export interface PolylineDraftToolState {
    current?: Point2D;
    points: readonly Point2D[];
    tool: 'draw-polyline';
}

export type DraftToolState =
    | ArcDraftToolState
    | LineDraftToolState
    | PolylineDraftToolState
    | SelectDraftToolState;

export const DEFAULT_ENTITY_STYLE: EntityStyle = {
    strokeColor: '#123861',
    strokeWidth: 2,
};

let documentSequence = 0;
let entitySequence = 0;

export function createPoint2D(x: number, y: number): Point2D {
    return { x, y };
}

export function createDocumentId(prefix = 'document'): DocumentId {
    documentSequence += 1;

    return `${prefix}-${documentSequence.toString(36)}`;
}

export function createEntityId(prefix = 'entity'): EntityId {
    entitySequence += 1;

    return `${prefix}-${entitySequence.toString(36)}`;
}

export function createDrawingDocument(id: DocumentId, name: string): DrawingDocument {
    return {
        entities: [],
        id,
        name,
    };
}

export function createSelectionState(): SelectionState {
    return { entityIds: [] };
}

export function createViewportState(): ViewportState {
    return {
        center: createPoint2D(0, 0),
        zoom: 1,
    };
}

export function createDraftToolState(tool: EditorTool): DraftToolState {
    if (tool === 'draw-line') {
        return { tool: 'draw-line' };
    }

    if (tool === 'draw-arc') {
        return { tool: 'draw-arc' };
    }

    if (tool === 'draw-polyline') {
        return {
            points: [],
            tool: 'draw-polyline',
        };
    }

    return { tool: 'select' };
}

export function addEntityToDocument(
    document: DrawingDocument,
    entity: DrawingEntity,
): DrawingDocument {
    return {
        ...document,
        entities: [...document.entities, entity],
    };
}

export function createLineEntity(id: EntityId, start: Point2D, end: Point2D): LineEntity {
    return {
        end,
        id,
        start,
        style: DEFAULT_ENTITY_STYLE,
        type: 'line',
        visible: true,
    };
}

export function createArcEntity(
    id: EntityId,
    center: Point2D,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterClockwise: boolean,
): ArcEntity {
    return {
        center,
        counterClockwise,
        endAngle,
        id,
        radius,
        startAngle,
        style: DEFAULT_ENTITY_STYLE,
        type: 'arc',
        visible: true,
    };
}

export function createPolylineEntity(id: EntityId, points: readonly Point2D[]): PolylineEntity {
    return {
        id,
        points,
        style: DEFAULT_ENTITY_STYLE,
        type: 'polyline',
        visible: true,
    };
}
