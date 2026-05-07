import { createLabelGlyphKey, DEFAULT_LABEL_FONT_WEIGHT, type LabelAtlas } from './labelAtlas';
import { calculateCameraBasis, type CameraBasis } from './cameraGeometry';
import type {
    CameraState,
    LabelVertex,
    Matrix4,
    RenderVertex,
    ScreenPoint2,
    ViewCubeArrowCommand,
    ViewCubeCornerId,
    ViewCubeTargetId,
    ViewportSize,
} from './types';
import {
    Angle,
    Arc2,
    Circle2,
    Containment,
    Coord3,
    CurveSampler,
    DEFAULT_TOLERANCE,
    Measurement,
    Vec2,
    Vec3,
    type Vector3,
} from '@occt-draw/math';

interface ScreenPoint {
    readonly x: number;
    readonly y: number;
}

interface ViewCubeMatrices {
    readonly bodyMatrix: Float32Array;
    readonly screenMatrix: Float32Array;
}

interface ProjectedPoint {
    readonly depth: number;
    readonly point: Vector3;
}

interface MeshTarget {
    readonly depth: number;
    readonly id: ViewCubeTargetId;
    readonly points: readonly ScreenPoint[];
}

interface CircleTarget {
    readonly center: ScreenPoint;
    readonly depth: number;
    readonly id: ViewCubeTargetId;
    readonly radius: number;
}

interface ArrowTarget {
    readonly center?: ScreenPoint;
    readonly headPoints?: readonly ScreenPoint[];
    readonly id: ViewCubeArrowCommand;
    readonly innerRadius?: number;
    readonly outerRadius?: number;
    readonly points?: readonly ScreenPoint[];
    readonly startAngle?: number;
    readonly endAngle?: number;
}

interface ViewCubeLayout {
    readonly arrows: readonly ArrowTarget[];
    readonly axisLabels: readonly TextPart[];
    readonly corners: readonly CircleTarget[];
    readonly faceLabels: readonly TextPart[];
    readonly faces: readonly MeshTarget[];
    readonly hiddenAxisSegments: readonly LinePart[];
    readonly lines: readonly LinePart[];
    readonly triangles: readonly TrianglePart[];
}

interface TrianglePart {
    readonly alpha: number;
    readonly color: Vector3;
    readonly depth: number;
    readonly points: readonly [Vector3, Vector3, Vector3];
    readonly surface: ViewCubeSurface;
    readonly targetId: ViewCubeTargetId | null;
}

type ViewCubeSurface = 'arrow' | 'corner' | 'face-back' | 'face-front';
type ViewCubeTextSpace = 'body' | 'screen';

interface LinePart {
    readonly alpha: number;
    readonly color: Vector3;
    readonly depth: number;
    readonly end: Vector3;
    readonly start: Vector3;
}

interface TextPart {
    readonly alpha: number;
    readonly center: Vector3;
    readonly color: Vector3;
    readonly coordinateSpace: ViewCubeTextSpace;
    readonly depth: number;
    readonly height: number;
    readonly id: ViewCubeTargetId | null;
    readonly text: string;
    readonly xAxis?: Vector3;
    readonly yAxis?: Vector3;
}

interface FaceDefinition {
    readonly center: Vector3;
    readonly id: ViewCubeTargetId;
    readonly label: string;
    readonly normal: Vector3;
    readonly uAxis: Vector3;
    readonly vAxis: Vector3;
}

export type ViewCubeOverlayCommand = ViewCubeOverlayLabelCommand | ViewCubeOverlayPrimitiveCommand;

export interface ViewCubeOverlayLabelCommand {
    readonly kind: 'labels';
    readonly matrix: Matrix4;
    readonly state: ViewCubeOverlayRenderState;
    readonly vertices: readonly LabelVertex[];
}

export interface ViewCubeOverlayModel {
    readonly commands: readonly ViewCubeOverlayCommand[];
}

export interface ViewCubeOverlayPrimitiveCommand {
    readonly drawMode: 'lines' | 'points' | 'triangles';
    readonly kind: 'primitives';
    readonly matrix: Matrix4;
    readonly pointShape?: 'circle' | 'marker' | 'none';
    readonly pointSize?: number;
    readonly state: ViewCubeOverlayRenderState;
    readonly vertices: readonly RenderVertex[];
}

export interface ViewCubeOverlayRenderState {
    readonly blend?: boolean;
    readonly clearDepthBuffer?: boolean;
    readonly cullFace?: 'back' | 'front' | 'none';
    readonly depthFunc?: 'lequal' | 'less';
    readonly depthTest?: boolean;
    readonly depthWrite?: boolean;
}

const VIEW_CUBE_SCREEN_SIZE_PX = 150;
const VIEW_CUBE_TOP_MARGIN_PX = 15;
const VIEW_CUBE_RIGHT_MARGIN_PX = 15;
const VIEW_CUBE_FRONT_SIZE = 0.62;
const VIEW_CUBE_BACK_SIZE = 0.95;
const VIEW_CUBE_CONTROL_HALF_SIZE = 0.5;
const VIEW_CUBE_CORNER_CENTER_SCALE = 0.8;
const VIEW_CUBE_CORNER_RADIUS_SCALE = 0.24;
const VIEW_CUBE_ARROW_WIDTH = 0.1;
const VIEW_CUBE_ARROW_HEIGHT = 0.13;
const VIEW_CUBE_ARROW_ARC_WIDTH = 0.04;
const VIEW_CUBE_TEXT_HEIGHT_PX = 12;
const VIEW_CUBE_AXIS_TEXT_HEIGHT_PX = 12;
const VIEW_CUBE_AXIS_GAP = 1;
const VIEW_CUBE_HIDDEN_AXIS_OPACITY = 0.3;
const VIEW_CUBE_AXIS_LABEL_GAP = 2;
const VIEW_CUBE_AXIS_LABEL_FADE_START_ANGLE = 8;
const VIEW_CUBE_AXIS_LABEL_FADE_END_ANGLE = 2;
const ROUNDED_RECT_SEGMENTS = 9;
const CIRCLE_SEGMENTS = 36;
const ARC_SEGMENTS = 18;
const VIEW_CUBE_DEPTH_SCALE = 0.35;
const FACE_LABEL_NORMAL_OFFSET = 0.004;
const CENTER_LOCAL = { x: 0, y: 0 };

const FACE_COLOR = Vec3.of(1, 1, 1);
const FACE_ALPHA = 0.95;
const FACE_HOVER_ALPHA = 0.6;
const BACK_FACE_COLOR = Vec3.of(206 / 255, 219 / 255, 229 / 255);
const BACK_FACE_ALPHA = 0.6;
const FACE_HOVER_COLOR = Vec3.of(144 / 255, 206 / 255, 241 / 255);
const BACK_FACE_HOVER_COLOR = FACE_HOVER_COLOR;
const TEXT_COLOR = Vec3.of(0.02, 0.025, 0.03);
const TEXT_HOVER_COLOR = Vec3.of(1, 1, 1);
const ARROW_COLOR = BACK_FACE_COLOR;
const ARROW_ALPHA = 0.6;
const ARROW_HOVER_COLOR = Vec3.of(0.24, 0.55, 0.9);
const CORNER_COLOR = Vec3.of(0.88, 0.92, 0.96);
const CORNER_HOVER_COLOR = Vec3.of(0.28, 0.6, 0.92);
const HIDDEN_AXIS_COLOR = Vec3.of(0.52, 0.56, 0.62);
const X_AXIS_COLOR = Vec3.of(0.85, 0.12, 0.1);
const Y_AXIS_COLOR = Vec3.of(0.1, 0.58, 0.2);
const Z_AXIS_COLOR = Vec3.of(0.15, 0.38, 0.85);

export function createViewCubeOverlayModel(input: {
    readonly camera: CameraState;
    readonly glyphs: LabelAtlas['glyphs'];
    readonly hoveredTargetId: ViewCubeTargetId | null;
    readonly viewportSize: ViewportSize;
}): ViewCubeOverlayModel {
    const matrices = createViewCubeMatrices(input.camera, input.viewportSize);
    const layout = createViewCubeLayout(input.camera);
    const vertices = createViewCubeVertices(layout, input.hoveredTargetId);
    const faceLabelVertices = createViewCubeLabelVertices({
        glyphs: input.glyphs,
        hoveredTargetId: input.hoveredTargetId,
        labels: layout.faceLabels,
    });
    const axisLabelVertices = createViewCubeLabelVertices({
        glyphs: input.glyphs,
        hoveredTargetId: input.hoveredTargetId,
        labels: layout.axisLabels,
    });
    const axisLabelShowThroughVertices = createViewCubeLabelVertices({
        glyphs: input.glyphs,
        hoveredTargetId: input.hoveredTargetId,
        labels: createShowThroughLabels(layout.axisLabels),
    });
    const commands: ViewCubeOverlayCommand[] = [
        createViewCubePrimitiveCommand(vertices.backTriangles, 'triangles', matrices.bodyMatrix, {
            blend: true,
            clearDepthBuffer: true,
            cullFace: 'front',
            depthTest: true,
            depthWrite: true,
        }),
        createViewCubePrimitiveCommand(vertices.frontTriangles, 'triangles', matrices.bodyMatrix, {
            blend: true,
            cullFace: 'back',
            depthTest: true,
            depthWrite: true,
        }),
        createViewCubeLabelCommand(faceLabelVertices, matrices.bodyMatrix, {
            blend: true,
            cullFace: 'back',
            depthTest: true,
            depthWrite: true,
        }),
        createViewCubePrimitiveCommand(vertices.bodyLines, 'lines', matrices.bodyMatrix, {
            blend: true,
            cullFace: 'none',
            depthTest: true,
            depthWrite: false,
        }),
        createViewCubeLabelCommand(axisLabelVertices, matrices.screenMatrix, {
            blend: true,
            cullFace: 'none',
            depthTest: true,
            depthWrite: false,
        }),
        createViewCubePrimitiveCommand(
            vertices.showThroughBodyLines,
            'lines',
            matrices.bodyMatrix,
            {
                blend: true,
                cullFace: 'none',
                depthTest: false,
                depthWrite: false,
            },
        ),
        createViewCubeLabelCommand(axisLabelShowThroughVertices, matrices.screenMatrix, {
            blend: true,
            cullFace: 'none',
            depthTest: false,
            depthWrite: false,
        }),
        createViewCubePrimitiveCommand(
            vertices.screenTriangles,
            'triangles',
            matrices.screenMatrix,
            {
                blend: true,
                cullFace: 'none',
                depthTest: false,
                depthWrite: false,
            },
        ),
    ];

    return { commands: commands.filter((command) => command.vertices.length > 0) };
}

function createViewCubeLabelCommand(
    vertices: readonly LabelVertex[],
    matrix: Matrix4,
    state: ViewCubeOverlayRenderState,
): ViewCubeOverlayLabelCommand {
    return {
        kind: 'labels',
        matrix,
        state,
        vertices,
    };
}

function createViewCubePrimitiveCommand(
    vertices: readonly RenderVertex[],
    drawMode: ViewCubeOverlayPrimitiveCommand['drawMode'],
    matrix: Matrix4,
    state: ViewCubeOverlayRenderState,
): ViewCubeOverlayPrimitiveCommand {
    return {
        drawMode,
        kind: 'primitives',
        matrix,
        pointShape: 'none',
        pointSize: 1,
        state,
        vertices,
    };
}

export function findViewCubeTargetAtPoint(input: {
    readonly camera: CameraState;
    readonly point: ScreenPoint2;
    readonly viewportSize: ViewportSize;
}): ViewCubeTargetId | null {
    const layout = createViewCubeLayout(input.camera);
    const localPoint = screenToLocal(input.point, input.viewportSize);

    if (localPoint.x < -VIEW_CUBE_CONTROL_HALF_SIZE || localPoint.x > VIEW_CUBE_CONTROL_HALF_SIZE) {
        return null;
    }

    if (localPoint.y < -VIEW_CUBE_CONTROL_HALF_SIZE || localPoint.y > VIEW_CUBE_CONTROL_HALF_SIZE) {
        return null;
    }

    const arrow = layout.arrows.find((target) => isPointInArrow(target, localPoint));

    if (arrow) {
        return arrow.id;
    }

    const corner = findClosest(
        layout.corners,
        (target) => Measurement.distance2(target.center, localPoint).value <= target.radius,
    );

    if (corner) {
        return corner.id;
    }

    return (
        findClosest(
            layout.faces,
            (target) => Containment.pointInPolygon2(localPoint, target.points).contains,
        )?.id ?? null
    );
}

export function getViewCubeViewportRect(viewportSize: ViewportSize): {
    readonly height: number;
    readonly left: number;
    readonly top: number;
    readonly width: number;
} {
    const origin = getViewCubeOrigin(viewportSize);

    return {
        height: VIEW_CUBE_SCREEN_SIZE_PX,
        left: origin.x,
        top: origin.y,
        width: VIEW_CUBE_SCREEN_SIZE_PX,
    };
}

function createViewCubeLayout(camera: CameraState): ViewCubeLayout {
    const basis = calculateCameraBasis(camera);
    const bodyHalfSize = calculateViewCubeBodyHalfSize();
    const triangles: TrianglePart[] = [];
    const lines: LinePart[] = [];
    const hiddenAxisSegments: LinePart[] = [];
    const faceLabels: TextPart[] = [];
    const axisLabels: TextPart[] = [];
    const faces: MeshTarget[] = [];
    const corners: CircleTarget[] = [];

    for (const face of createFaceDefinitions(bodyHalfSize)) {
        const frontSize = bodyHalfSize * 2 * VIEW_CUBE_FRONT_SIZE;
        const backSize = bodyHalfSize * 2 * VIEW_CUBE_BACK_SIZE;
        const cornerRadius = bodyHalfSize * VIEW_CUBE_CORNER_RADIUS_SCALE;
        const backPoints3 = createRoundedRectangle3(
            face.center,
            face.uAxis,
            face.vAxis,
            backSize,
            backSize,
            cornerRadius,
            face.normal,
        );
        const frontPoints3 = createRoundedRectangle3(
            face.center,
            face.uAxis,
            face.vAxis,
            frontSize,
            frontSize,
            cornerRadius,
            face.normal,
        );
        const frontPoints = frontPoints3.map((point) => projectLocalPoint(point, basis));
        const frontTargetPoints = frontPoints.map((point) => toScreenPoint(point.point));
        const faceDepth = averageDepth(frontPoints);
        const backPoints = backPoints3.map((point) => projectLocalPoint(point, basis));
        const backTargetPoints = backPoints.map((point) => toScreenPoint(point.point));
        const backDepth = averageDepth(backPoints);

        appendTriangleFan(
            triangles,
            backPoints3,
            BACK_FACE_COLOR,
            BACK_FACE_ALPHA,
            faceDepth - 0.02,
            'face-back',
            face.id,
        );
        appendTriangleFan(
            triangles,
            frontPoints3,
            FACE_COLOR,
            FACE_ALPHA,
            faceDepth + 0.02,
            'face-front',
            face.id,
        );

        if (Measurement.polygonSignedArea2(frontTargetPoints).value > 0) {
            faces.push({
                depth: faceDepth,
                id: face.id,
                points: frontTargetPoints,
            });
        }

        if (Measurement.polygonSignedArea2(backTargetPoints).value < 0) {
            faces.push({
                depth: backDepth,
                id: face.id,
                points: backTargetPoints,
            });
        }

        faceLabels.push({
            alpha: 1,
            center: Vec3.add(face.center, Vec3.scale(face.normal, FACE_LABEL_NORMAL_OFFSET)),
            color: TEXT_COLOR,
            coordinateSpace: 'body',
            depth: faceDepth + 0.04,
            height: VIEW_CUBE_TEXT_HEIGHT_PX,
            id: face.id,
            text: face.label,
            xAxis: Vec3.normalize(face.uAxis),
            yAxis: Vec3.normalize(face.vAxis),
        });
    }

    for (const corner of createCornerDefinitions(bodyHalfSize)) {
        const normal = Vec3.normalize(corner.position);
        const reference = Math.abs(normal.z) < 0.9 ? Vec3.of(0, 0, 1) : Vec3.of(0, 1, 0);
        const u = Vec3.cross(reference, normal).normalize();
        const v = Vec3.cross(normal, u).normalize();
        const circleFrame = new Coord3({
            origin: corner.position,
            xAxis: u,
            yAxis: v,
            zAxis: normal,
        });
        const circlePoints3 = CurveSampler.sampleCurve2(
            new Circle2(Vec2.zero(), corner.radius),
            CIRCLE_SEGMENTS,
            { includeEnd: false },
        ).map((point) => circleFrame.localToWorld(Vec3.of(point.x, point.y, 0)));
        const circlePoints = circlePoints3.map((point) => projectLocalPoint(point, basis));
        const projectedCenter = projectLocalPoint(corner.position, basis);
        const projectedCirclePoints = circlePoints.map((point) => toScreenPoint(point.point));

        appendTriangleFan(
            triangles,
            circlePoints3,
            CORNER_COLOR,
            0.9,
            projectedCenter.depth + 0.08,
            'corner',
            corner.id,
        );

        if (Measurement.polygonSignedArea2(projectedCirclePoints).value > 0) {
            corners.push({
                center: toScreenPoint(projectedCenter.point),
                depth: projectedCenter.depth,
                id: corner.id,
                radius: calculateProjectedRadius(projectedCirclePoints, projectedCenter.point),
            });
        }
    }

    appendAxisParts(lines, hiddenAxisSegments, axisLabels, basis, bodyHalfSize);
    const arrows = createArrowTargets();
    appendArrowParts(triangles, arrows);

    return {
        arrows,
        axisLabels,
        corners,
        faceLabels,
        faces,
        hiddenAxisSegments,
        lines,
        triangles,
    };
}

function createViewCubeMatrices(camera: CameraState, viewportSize: ViewportSize): ViewCubeMatrices {
    const basis = calculateCameraBasis(camera);
    const origin = getViewCubeOrigin(viewportSize);
    const viewportWidth = Math.max(viewportSize.width, 1);
    const viewportHeight = Math.max(viewportSize.height, 1);
    const centerX = origin.x + VIEW_CUBE_SCREEN_SIZE_PX / 2;
    const centerY = origin.y + VIEW_CUBE_SCREEN_SIZE_PX / 2;
    const scaleX = (VIEW_CUBE_SCREEN_SIZE_PX / viewportWidth) * 2;
    const scaleY = (VIEW_CUBE_SCREEN_SIZE_PX / viewportHeight) * 2;
    const centerClipX = (centerX / viewportWidth) * 2 - 1;
    const centerClipY = 1 - (centerY / viewportHeight) * 2;

    return {
        bodyMatrix: new Float32Array([
            scaleX * basis.right.x,
            scaleY * basis.up.x,
            VIEW_CUBE_DEPTH_SCALE * basis.forward.x,
            0,
            scaleX * basis.right.y,
            scaleY * basis.up.y,
            VIEW_CUBE_DEPTH_SCALE * basis.forward.y,
            0,
            scaleX * basis.right.z,
            scaleY * basis.up.z,
            VIEW_CUBE_DEPTH_SCALE * basis.forward.z,
            0,
            centerClipX,
            centerClipY,
            0,
            1,
        ]),
        screenMatrix: new Float32Array([
            scaleX,
            0,
            0,
            0,
            0,
            scaleY,
            0,
            0,
            0,
            0,
            VIEW_CUBE_DEPTH_SCALE,
            0,
            centerClipX,
            centerClipY,
            0,
            1,
        ]),
    };
}

function createViewCubeVertices(
    layout: ViewCubeLayout,
    hoveredTargetId: ViewCubeTargetId | null,
): {
    readonly backTriangles: readonly RenderVertex[];
    readonly bodyLines: readonly RenderVertex[];
    readonly frontTriangles: readonly RenderVertex[];
    readonly showThroughBodyLines: readonly RenderVertex[];
    readonly screenTriangles: readonly RenderVertex[];
} {
    const backTriangles: RenderVertex[] = [];
    const frontTriangles: RenderVertex[] = [];
    const screenTriangles: RenderVertex[] = [];
    const bodyLines: RenderVertex[] = [];
    const showThroughBodyLines: RenderVertex[] = [];

    for (const triangle of layout.triangles) {
        const targetHoverColor = getHoverColorForTriangle(triangle, hoveredTargetId);
        const triangleColor = targetHoverColor ?? triangle.color;
        const alpha = getTriangleAlpha(triangle, targetHoverColor !== null);
        const target = resolveTriangleVertexTarget(
            triangle,
            backTriangles,
            frontTriangles,
            screenTriangles,
        );

        for (const point of triangle.points) {
            target.push({
                alpha,
                color: triangleColor,
                position: point,
            });
        }
    }

    appendLineVertices(bodyLines, layout.lines);
    appendLineVertices(showThroughBodyLines, layout.hiddenAxisSegments);

    return { backTriangles, bodyLines, frontTriangles, screenTriangles, showThroughBodyLines };
}

function appendLineVertices(target: RenderVertex[], lines: readonly LinePart[]): void {
    for (const line of lines) {
        target.push(
            {
                alpha: line.alpha,
                color: line.color,
                position: line.start,
            },
            {
                alpha: line.alpha,
                color: line.color,
                position: line.end,
            },
        );
    }
}

function createViewCubeLabelVertices(input: {
    readonly glyphs: LabelAtlas['glyphs'];
    readonly hoveredTargetId: ViewCubeTargetId | null;
    readonly labels: readonly TextPart[];
}): readonly LabelVertex[] {
    const vertices: LabelVertex[] = [];

    for (const label of input.labels) {
        const glyph = input.glyphs.get(createLabelGlyphKey(label.text, DEFAULT_LABEL_FONT_WEIGHT));

        if (!glyph || label.alpha <= 0) {
            continue;
        }

        const height = label.height / VIEW_CUBE_SCREEN_SIZE_PX;
        const width = height * (glyph.widthPixels / Math.max(glyph.heightPixels, 1));
        const labelColor =
            label.id !== null && label.id === input.hoveredTargetId
                ? TEXT_HOVER_COLOR
                : label.color;
        const quad = createLabelQuad(label, width, height);
        const alpha = label.id !== null && label.id === input.hoveredTargetId ? 1 : label.alpha;

        vertices.push(
            createLabelVertex(quad.bottomLeft, glyph.minU, glyph.maxV, labelColor, alpha),
            createLabelVertex(quad.bottomRight, glyph.maxU, glyph.maxV, labelColor, alpha),
            createLabelVertex(quad.topRight, glyph.maxU, glyph.minV, labelColor, alpha),
            createLabelVertex(quad.bottomLeft, glyph.minU, glyph.maxV, labelColor, alpha),
            createLabelVertex(quad.topRight, glyph.maxU, glyph.minV, labelColor, alpha),
            createLabelVertex(quad.topLeft, glyph.minU, glyph.minV, labelColor, alpha),
        );
    }

    return vertices;
}

function createShowThroughLabels(labels: readonly TextPart[]): readonly TextPart[] {
    return labels.map((label) => ({
        ...label,
        alpha: Math.min(label.alpha, VIEW_CUBE_HIDDEN_AXIS_OPACITY),
    }));
}

function getHoverColorForTriangle(
    triangle: TrianglePart,
    hoveredTargetId: ViewCubeTargetId | null,
): Vector3 | null {
    if (hoveredTargetId === null) {
        return null;
    }

    if (triangle.targetId === hoveredTargetId) {
        if (triangle.surface === 'face-front') {
            return FACE_HOVER_COLOR;
        }

        if (triangle.surface === 'face-back') {
            return BACK_FACE_HOVER_COLOR;
        }

        if (triangle.surface === 'corner') {
            return CORNER_HOVER_COLOR;
        }

        return ARROW_HOVER_COLOR;
    }

    return null;
}

function getTriangleAlpha(triangle: TrianglePart, hovered: boolean): number {
    if (!hovered) {
        return triangle.alpha;
    }

    if (triangle.surface === 'face-front') {
        return FACE_HOVER_ALPHA;
    }

    if (triangle.surface === 'face-back') {
        return FACE_HOVER_ALPHA;
    }

    return Math.min(triangle.alpha + 0.08, 1);
}

function resolveTriangleVertexTarget(
    triangle: TrianglePart,
    backTriangles: RenderVertex[],
    frontTriangles: RenderVertex[],
    screenTriangles: RenderVertex[],
): RenderVertex[] {
    if (triangle.surface === 'face-back') {
        return backTriangles;
    }

    if (triangle.surface === 'arrow') {
        return screenTriangles;
    }

    return frontTriangles;
}

function appendAxisParts(
    lines: LinePart[],
    hiddenAxisSegments: LinePart[],
    labels: TextPart[],
    basis: CameraBasis,
    bodyHalfSize: number,
): void {
    const start = Vec3.of(
        -bodyHalfSize - localFromPixels(VIEW_CUBE_AXIS_GAP),
        -bodyHalfSize - localFromPixels(VIEW_CUBE_AXIS_GAP),
        -bodyHalfSize - localFromPixels(VIEW_CUBE_AXIS_GAP),
    );
    const axes = [
        { axis: Vec3.of(1, 0, 0), color: X_AXIS_COLOR, text: 'X' },
        { axis: Vec3.of(0, 1, 0), color: Y_AXIS_COLOR, text: 'Y' },
        { axis: Vec3.of(0, 0, 1), color: Z_AXIS_COLOR, text: 'Z' },
    ];

    for (const item of axes) {
        const end = Vec3.add(start, Vec3.scale(item.axis, bodyHalfSize * 2));
        const projectedStart = projectLocalPoint(start, basis);
        const projectedEnd = projectLocalPoint(end, basis);
        const facing = Math.max(0, Vec3.dot(Vec3.normalize(item.axis), basis.forward));
        const alpha = calculateAxisLabelAlpha(facing);

        lines.push({
            alpha: 0.9,
            color: item.color,
            depth: (projectedStart.depth + projectedEnd.depth) / 2 + 0.1,
            end,
            start,
        });
        appendDashedLine(
            hiddenAxisSegments,
            start,
            end,
            HIDDEN_AXIS_COLOR,
            VIEW_CUBE_HIDDEN_AXIS_OPACITY,
            projectedStart.depth - 0.2,
        );
        labels.push({
            alpha,
            center: offsetViewPoint(
                projectedEnd.point,
                normalize2(
                    subtractPoint(
                        toScreenPoint(projectedEnd.point),
                        toScreenPoint(projectedStart.point),
                    ),
                ),
                localFromPixels(VIEW_CUBE_AXIS_LABEL_GAP + VIEW_CUBE_AXIS_TEXT_HEIGHT_PX / 2),
            ),
            color: item.color,
            coordinateSpace: 'screen',
            depth: projectedEnd.depth + 0.12,
            height: VIEW_CUBE_AXIS_TEXT_HEIGHT_PX,
            id: null,
            text: item.text,
        });
    }
}

function appendArrowParts(triangles: TrianglePart[], arrows: readonly ArrowTarget[]): void {
    for (const arrow of arrows) {
        if (arrow.points) {
            appendLocalPolygonTriangles(
                triangles,
                arrow.points.map(toViewPoint),
                ARROW_COLOR,
                ARROW_ALPHA,
                3,
                'arrow',
                arrow.id,
            );
            continue;
        }

        if (
            arrow.center === undefined ||
            arrow.innerRadius === undefined ||
            arrow.outerRadius === undefined ||
            arrow.startAngle === undefined ||
            arrow.endAngle === undefined
        ) {
            continue;
        }

        const points = createAnnularSectorPoints(
            arrow.center,
            arrow.innerRadius,
            arrow.outerRadius,
            arrow.startAngle,
            arrow.endAngle,
        );

        for (let index = 0; index < points.inner.length - 1; index++) {
            const innerA = points.inner[index];
            const innerB = points.inner[index + 1];
            const outerA = points.outer[index];
            const outerB = points.outer[index + 1];

            if (innerA && innerB && outerA && outerB) {
                triangles.push(
                    createTrianglePart(
                        toViewPoint(outerA),
                        toViewPoint(innerA),
                        toViewPoint(innerB),
                        ARROW_COLOR,
                        ARROW_ALPHA,
                        3,
                        'arrow',
                        arrow.id,
                    ),
                    createTrianglePart(
                        toViewPoint(outerA),
                        toViewPoint(innerB),
                        toViewPoint(outerB),
                        ARROW_COLOR,
                        ARROW_ALPHA,
                        3,
                        'arrow',
                        arrow.id,
                    ),
                );
            }
        }

        if (arrow.headPoints) {
            appendLocalPolygonTriangles(
                triangles,
                arrow.headPoints.map(toViewPoint),
                ARROW_COLOR,
                ARROW_ALPHA,
                3,
                'arrow',
                arrow.id,
            );
        }
    }
}

function createArrowTargets(): readonly ArrowTarget[] {
    const radius = VIEW_CUBE_CONTROL_HALF_SIZE;
    const halfWidth = VIEW_CUBE_ARROW_WIDTH / 2;
    const halfHeight = VIEW_CUBE_ARROW_HEIGHT / 2;
    const arrowBase = radius - halfHeight;
    const cwStart = Math.PI * 0.25;
    const cwEnd = Math.PI * 0.4;
    const ccwStart = Math.PI * 0.6;
    const ccwEnd = Math.PI * 0.75;
    const arcMidRadius = radius - halfWidth;
    const diagonal = Math.PI / 4;
    const diagonalSin = Math.sin(diagonal);
    const diagonalCos = Math.cos(diagonal);
    const arrowTipSin = Math.sin(diagonal - halfHeight / radius);
    const arrowTipCos = Math.cos(diagonal - halfHeight / radius);

    return [
        {
            id: 'arrow-left',
            points: [
                { x: -radius, y: 0 },
                { x: -arrowBase, y: -halfWidth },
                { x: -arrowBase, y: halfWidth },
            ],
        },
        {
            id: 'arrow-right',
            points: [
                { x: radius, y: 0 },
                { x: arrowBase, y: halfWidth },
                { x: arrowBase, y: -halfWidth },
            ],
        },
        {
            id: 'arrow-up',
            points: [
                { x: 0, y: radius },
                { x: -halfWidth, y: arrowBase },
                { x: halfWidth, y: arrowBase },
            ],
        },
        {
            id: 'arrow-down',
            points: [
                { x: 0, y: -radius },
                { x: halfWidth, y: -arrowBase },
                { x: -halfWidth, y: -arrowBase },
            ],
        },
        {
            center: CENTER_LOCAL,
            endAngle: cwEnd,
            headPoints: [
                { x: diagonalCos * radius, y: diagonalSin * radius },
                {
                    x: diagonalCos * (radius - 2 * halfWidth),
                    y: diagonalSin * (radius - 2 * halfWidth),
                },
                {
                    x: arrowTipCos * (radius - halfWidth),
                    y: arrowTipSin * (radius - halfWidth),
                },
            ],
            id: 'arrow-cw',
            innerRadius: arcMidRadius - VIEW_CUBE_ARROW_ARC_WIDTH / 2,
            outerRadius: arcMidRadius + VIEW_CUBE_ARROW_ARC_WIDTH / 2,
            startAngle: cwStart,
        },
        {
            center: CENTER_LOCAL,
            endAngle: ccwEnd,
            headPoints: [
                {
                    x: -diagonalCos * (radius - 2 * halfWidth),
                    y: diagonalSin * (radius - 2 * halfWidth),
                },
                { x: -diagonalCos * radius, y: diagonalSin * radius },
                {
                    x: -arrowTipCos * (radius - halfWidth),
                    y: arrowTipSin * (radius - halfWidth),
                },
            ],
            id: 'arrow-ccw',
            innerRadius: arcMidRadius - VIEW_CUBE_ARROW_ARC_WIDTH / 2,
            outerRadius: arcMidRadius + VIEW_CUBE_ARROW_ARC_WIDTH / 2,
            startAngle: ccwStart,
        },
    ];
}

function calculateViewCubeBodyHalfSize(): number {
    const availableRadius = VIEW_CUBE_CONTROL_HALF_SIZE - VIEW_CUBE_ARROW_WIDTH;
    const labelPadding = localFromPixels(VIEW_CUBE_AXIS_TEXT_HEIGHT_PX) / 1.5;

    return Math.max(0.12, availableRadius / 1.6 - labelPadding);
}

function createFaceDefinitions(bodyHalfSize: number): readonly FaceDefinition[] {
    return [
        {
            center: Vec3.of(0, 0, bodyHalfSize),
            id: 'top',
            label: '上',
            normal: Vec3.of(0, 0, 1),
            uAxis: Vec3.of(1, 0, 0),
            vAxis: Vec3.of(0, 1, 0),
        },
        {
            center: Vec3.of(0, 0, -bodyHalfSize),
            id: 'bottom',
            label: '下',
            normal: Vec3.of(0, 0, -1),
            uAxis: Vec3.of(1, 0, 0),
            vAxis: Vec3.of(0, -1, 0),
        },
        {
            center: Vec3.of(0, -bodyHalfSize, 0),
            id: 'front',
            label: '前',
            normal: Vec3.of(0, -1, 0),
            uAxis: Vec3.of(1, 0, 0),
            vAxis: Vec3.of(0, 0, 1),
        },
        {
            center: Vec3.of(0, bodyHalfSize, 0),
            id: 'back',
            label: '后',
            normal: Vec3.of(0, 1, 0),
            uAxis: Vec3.of(-1, 0, 0),
            vAxis: Vec3.of(0, 0, 1),
        },
        {
            center: Vec3.of(bodyHalfSize, 0, 0),
            id: 'right',
            label: '右',
            normal: Vec3.of(1, 0, 0),
            uAxis: Vec3.of(0, 1, 0),
            vAxis: Vec3.of(0, 0, 1),
        },
        {
            center: Vec3.of(-bodyHalfSize, 0, 0),
            id: 'left',
            label: '左',
            normal: Vec3.of(-1, 0, 0),
            uAxis: Vec3.of(0, -1, 0),
            vAxis: Vec3.of(0, 0, 1),
        },
    ];
}

function createCornerDefinitions(bodyHalfSize: number): readonly {
    readonly id: ViewCubeCornerId;
    readonly position: Vector3;
    readonly radius: number;
}[] {
    const value = bodyHalfSize * VIEW_CUBE_CORNER_CENTER_SCALE;
    const radius = bodyHalfSize * VIEW_CUBE_CORNER_RADIUS_SCALE;
    const corners: { id: ViewCubeCornerId; position: Vector3; radius: number }[] = [];

    for (const x of [-value, value]) {
        for (const y of [-value, value]) {
            for (const z of [-value, value]) {
                corners.push({
                    id: vectorToCornerId(Vec3.of(x, y, z)),
                    position: Vec3.of(x, y, z),
                    radius,
                });
            }
        }
    }

    return corners;
}

function createRoundedRectangle3(
    center: Vector3,
    uAxis: Vector3,
    vAxis: Vector3,
    width: number,
    height: number,
    radius: number,
    normal: Vector3,
): readonly Vector3[] {
    const u = Vec3.normalize(uAxis);
    const v = Vec3.normalize(vAxis);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const r = Math.min(radius, halfWidth, halfHeight);
    const frame = new Coord3({
        origin: center,
        xAxis: u,
        yAxis: v,
        zAxis: normal,
    });
    const corners = [
        { centerU: halfWidth - r, centerV: halfHeight - r, start: 0, end: Math.PI / 2 },
        { centerU: -halfWidth + r, centerV: halfHeight - r, start: Math.PI / 2, end: Math.PI },
        {
            centerU: -halfWidth + r,
            centerV: -halfHeight + r,
            start: Math.PI,
            end: (3 * Math.PI) / 2,
        },
        {
            centerU: halfWidth - r,
            centerV: -halfHeight + r,
            start: (3 * Math.PI) / 2,
            end: Math.PI * 2,
        },
    ];
    const points: Vector3[] = [];

    for (const corner of corners) {
        const arc = new Arc2(
            new Circle2(Vec2.of(corner.centerU, corner.centerV), r),
            Angle.fromRadians(corner.start),
            Angle.fromRadians(corner.end),
        );

        points.push(
            ...CurveSampler.sampleCurve2(arc, ROUNDED_RECT_SEGMENTS + 1).map((point) =>
                frame.localToWorld(Vec3.of(point.x, point.y, 0)),
            ),
        );
    }

    if (Vec3.dot(Vec3.cross(u, v), Vec3.normalize(normal)) < 0) {
        points.reverse();
    }

    return points;
}

function createAnnularSectorPoints(
    center: ScreenPoint,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number,
): { readonly inner: readonly ScreenPoint[]; readonly outer: readonly ScreenPoint[] } {
    const start = Angle.fromRadians(startAngle);
    const end = Angle.fromRadians(endAngle);
    const inner = CurveSampler.sampleCurve2(
        new Arc2(new Circle2(center, innerRadius), start, end),
        ARC_SEGMENTS + 1,
    );
    const outer = CurveSampler.sampleCurve2(
        new Arc2(new Circle2(center, outerRadius), start, end),
        ARC_SEGMENTS + 1,
    );

    return { inner, outer };
}

function appendTriangleFan(
    triangles: TrianglePart[],
    points: readonly Vector3[],
    triangleColor: Vector3,
    alpha: number,
    depth: number,
    surface: ViewCubeSurface,
    targetId: ViewCubeTargetId,
): void {
    if (points.length < 3) {
        return;
    }

    const center = getPolygonCenter(points);

    for (let index = 0; index < points.length; index++) {
        const current = points[index];
        const next = points[(index + 1) % points.length];

        if (current && next) {
            triangles.push(
                createTrianglePart(
                    center,
                    current,
                    next,
                    triangleColor,
                    alpha,
                    depth,
                    surface,
                    targetId,
                ),
            );
        }
    }
}

function appendLocalPolygonTriangles(
    triangles: TrianglePart[],
    points: readonly Vector3[],
    triangleColor: Vector3,
    alpha: number,
    depth: number,
    surface: ViewCubeSurface,
    targetId: ViewCubeTargetId,
): void {
    if (points.length < 3) {
        return;
    }

    const first = points[0];

    if (!first) {
        return;
    }

    for (let index = 1; index < points.length - 1; index++) {
        const second = points[index];
        const third = points[index + 1];

        if (second && third) {
            triangles.push(
                createTrianglePart(
                    first,
                    second,
                    third,
                    triangleColor,
                    alpha,
                    depth,
                    surface,
                    targetId,
                ),
            );
        }
    }
}

function appendDashedLine(
    lines: LinePart[],
    start: Vector3,
    end: Vector3,
    lineColor: Vector3,
    alpha: number,
    depth: number,
): void {
    const segments = 8;

    for (let index = 0; index < segments; index += 2) {
        const startProgress = index / segments;
        const endProgress = (index + 1) / segments;

        lines.push({
            alpha,
            color: lineColor,
            depth,
            end: Vec3.lerp(start, end, endProgress),
            start: Vec3.lerp(start, end, startProgress),
        });
    }
}

function createTrianglePart(
    a: Vector3,
    b: Vector3,
    c: Vector3,
    triangleColor: Vector3,
    alpha: number,
    depth: number,
    surface: ViewCubeSurface,
    targetId: ViewCubeTargetId,
): TrianglePart {
    return {
        alpha,
        color: triangleColor,
        depth,
        points: [a, b, c],
        surface,
        targetId,
    };
}

function createLabelVertex(
    position: Vector3,
    u: number,
    v: number,
    vertexColor: Vector3,
    alpha: number,
): LabelVertex {
    return {
        alpha,
        color: vertexColor,
        position,
        uv: { x: u, y: v },
    };
}

function createLabelQuad(
    label: TextPart,
    width: number,
    height: number,
): {
    readonly bottomLeft: Vector3;
    readonly bottomRight: Vector3;
    readonly topLeft: Vector3;
    readonly topRight: Vector3;
} {
    const xAxis = label.xAxis ?? Vec3.of(1, 0, 0);
    const yAxis = label.yAxis ?? Vec3.of(0, 1, 0);
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return {
        bottomLeft: Vec3.add(
            Vec3.add(label.center, Vec3.scale(xAxis, -halfWidth)),
            Vec3.scale(yAxis, -halfHeight),
        ),
        bottomRight: Vec3.add(
            Vec3.add(label.center, Vec3.scale(xAxis, halfWidth)),
            Vec3.scale(yAxis, -halfHeight),
        ),
        topLeft: Vec3.add(
            Vec3.add(label.center, Vec3.scale(xAxis, -halfWidth)),
            Vec3.scale(yAxis, halfHeight),
        ),
        topRight: Vec3.add(
            Vec3.add(label.center, Vec3.scale(xAxis, halfWidth)),
            Vec3.scale(yAxis, halfHeight),
        ),
    };
}

function projectLocalPoint(point: Vector3, basis: CameraBasis): ProjectedPoint {
    const viewPoint = Vec3.of(
        Vec3.dot(point, basis.right),
        Vec3.dot(point, basis.up),
        Vec3.dot(point, basis.forward),
    );

    return {
        depth: viewPoint.z,
        point: viewPoint,
    };
}

function screenToLocal(point: ScreenPoint2, viewportSize: ViewportSize): ScreenPoint {
    const origin = getViewCubeOrigin(viewportSize);

    return {
        x: (point.x - origin.x) / VIEW_CUBE_SCREEN_SIZE_PX - VIEW_CUBE_CONTROL_HALF_SIZE,
        y: VIEW_CUBE_CONTROL_HALF_SIZE - (point.y - origin.y) / VIEW_CUBE_SCREEN_SIZE_PX,
    };
}

function getViewCubeOrigin(viewportSize: ViewportSize): ScreenPoint {
    return {
        x: Math.max(0, viewportSize.width - VIEW_CUBE_SCREEN_SIZE_PX - VIEW_CUBE_RIGHT_MARGIN_PX),
        y: VIEW_CUBE_TOP_MARGIN_PX,
    };
}

function isPointInArrow(target: ArrowTarget, point: ScreenPoint): boolean {
    if (target.points) {
        return Containment.pointInPolygon2(point, target.points).contains;
    }

    if (
        target.center === undefined ||
        target.innerRadius === undefined ||
        target.outerRadius === undefined ||
        target.startAngle === undefined ||
        target.endAngle === undefined
    ) {
        return false;
    }

    if (target.headPoints && Containment.pointInPolygon2(point, target.headPoints).contains) {
        return true;
    }

    const radialDistance = Measurement.distance2(point, target.center).value;
    const angle = Angle.fromRadians(
        Math.atan2(point.y - target.center.y, point.x - target.center.x),
    ).normalizedPositive().radians;
    const start = Angle.fromRadians(target.startAngle).normalizedPositive().radians;
    const end = Angle.fromRadians(target.endAngle).normalizedPositive().radians;
    const isInsideAngle =
        start <= end ? angle >= start && angle <= end : angle >= start || angle <= end;

    return (
        radialDistance >= target.innerRadius - VIEW_CUBE_ARROW_HEIGHT * 0.5 &&
        radialDistance <= target.outerRadius + VIEW_CUBE_ARROW_HEIGHT * 0.5 &&
        isInsideAngle
    );
}

function vectorToCornerId(vector: Vector3): ViewCubeCornerId {
    const horizontal = vector.x > 0 ? 'right' : 'left';
    const depth = vector.y < 0 ? 'front' : 'back';
    const vertical = vector.z > 0 ? 'top' : 'bottom';

    return `${horizontal}-${depth}-${vertical}`;
}

function calculateAxisLabelAlpha(facing: number): number {
    const start = Math.cos((VIEW_CUBE_AXIS_LABEL_FADE_START_ANGLE / 180) * Math.PI);
    const end = Math.cos((VIEW_CUBE_AXIS_LABEL_FADE_END_ANGLE / 180) * Math.PI);

    if (facing <= start) {
        return 1;
    }

    if (facing >= end) {
        return 0;
    }

    return 1 - (facing - start) / Math.max(end - start, DEFAULT_TOLERANCE.distance);
}

function getPolygonCenter(points: readonly Vector3[]): Vector3 {
    return Vec3.of(
        points.reduce((sum, point) => sum + point.x, 0) / points.length,
        points.reduce((sum, point) => sum + point.y, 0) / points.length,
        points.reduce((sum, point) => sum + point.z, 0) / points.length,
    );
}

function averageDepth(points: readonly ProjectedPoint[]): number {
    return points.reduce((sum, point) => sum + point.depth, 0) / points.length;
}

function localFromPixels(pixels: number): number {
    return pixels / VIEW_CUBE_SCREEN_SIZE_PX;
}

function toScreenPoint(point: Vector3): ScreenPoint {
    return { x: point.x, y: point.y };
}

function toViewPoint(point: ScreenPoint): Vector3 {
    return Vec3.of(point.x, point.y, 0);
}

function findClosest<T extends { readonly depth: number }>(
    targets: readonly T[],
    predicate: (target: T) => boolean,
): T | null {
    return [...targets].sort((left, right) => left.depth - right.depth).find(predicate) ?? null;
}

function calculateProjectedRadius(points: readonly ScreenPoint[], center: Vector3): number {
    const centerPoint = toScreenPoint(center);

    return (
        points.reduce(
            (maxRadius, point) =>
                Math.max(maxRadius, Measurement.distance2(point, centerPoint).value),
            0,
        ) * 1.25
    );
}

function offsetViewPoint(point: Vector3, direction: ScreenPoint, amount: number): Vector3 {
    return Vec3.of(point.x + direction.x * amount, point.y + direction.y * amount, point.z);
}

function subtractPoint(left: ScreenPoint, right: ScreenPoint): ScreenPoint {
    return {
        x: left.x - right.x,
        y: left.y - right.y,
    };
}

function normalize2(point: ScreenPoint): ScreenPoint {
    const vector = Vec2.from(point);

    return vector.normalize();
}
